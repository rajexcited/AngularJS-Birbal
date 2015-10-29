(function (chrome, birbalJS, window) {
  'use strict';

  /////////////////////////////////////////////////////////
  //            LOGGER FOR DEVELOPMENT ONLY
  /////////////////////////////////////////////////////////
  // define 'noop' by default
  var locallog, proxylog;
  locallog = proxylog = function () {};
  if (birbalJS.debugMode) {
    // assign console.log or proxy logs
    locallog = function (any) {
      console.log(any);
    };
    // use proxy log
    proxylog = function (logMsg) {
      // get proxy logger when available
      proxylog = birbalJS.proxylog || proxylog;
      proxylog(logMsg);
    }
  }
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////

  locallog('panel.js is loading.');
  /////////////////////////////////////////////////////////
  //            Background connection setup
  /////////////////////////////////////////////////////////
  // Create a connection to the background page
  var backgroundConnection = chrome.runtime.connect({
    name: birbalJS.END_POINTS.PANEL
  });

  locallog('prepare for init message to BG');
  var backgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.PANEL, birbalJS.END_POINTS.CONTENTSCRIPT);
  var informBackground = function (info, task, newDest) {
    var msg = new backgroundMessage(info);
    msg.task = task || msg.task;
    msg.dest = newDest || msg.dest;
    backgroundConnection.postMessage(msg);
  };

  /////////////////////////////////////////////////////////
  //            panel actionBuilder
  /////////////////////////////////////////////////////////
  var temp = {};
  temp.panelActions = {};
  temp.panelActions.addPanel = function () {
    var action = this;
    // initialize panel with graphs and information
    birbalJS.on('documentLoad', function (event) {
      var messageData = action.message.data || {};
      var contentBody = $('#contentBody');
      contentBody.data({
        tmplData: messageData
      });

      function onbuttonClickListener(event, a, b, c) {
        var moduleName = messageData.ngModule || contentBody.find('INPUT#appInput').val();
        if (moduleName.trim() === '') {
          return;
        }
        locallog(moduleName);
        // register/enable/refresh
        informBackground({
          ngModule: moduleName,
          task: 'runAnalysis'
        });

        contentBody.attr('data-include-html', 'partials/dashboard.html');
      }

      contentBody.on('afterload', function (event, data) {
        if (data.src.indexOf('initPage.html') !== -1) {
          contentBody.find('BUTTON#openmodulebutton').on('click', onbuttonClickListener);
        }
      });
      // attribute update triggers template to render with new data
      contentBody.attr('data-include-html', 'partials/initPage.html');
    });

    action.status('panelAdded');
  };

  temp.panelActions.removePanel = function () {
    var action = this;
    // initialize panel with information and links to this project
    birbalJS.on('documentLoad', function (event) {
      var messageData = action.message.data || {};
      $('#contentBody').data({
        tmplData: messageData
      });
      // attribute update triggers template to render with new data
      $('#contentBody').attr('data-include-html', 'partials/initPage.html');
      // cleanup resources
      clearResources();
    });
    action.status('panelRemoved');
  };

  temp.panelActions.greeting = function () {
    var messageData = this.message.data;
    $.extend($('#contentBody').data('tmplData'), messageData);
    locallog($('#contentBody').data('tmplData'));
    locallog('in greeting');
    var contentBody = $('#contentBody');
    contentBody.on('afterload', function (event, data) {
      // 'includeStatus'
      contentBody.find('BUTTON#communication').on('click', function onClickCommun(e) {
        informBackground({
          acknowledge: 'Cya later.',
          task: 'replyHi'
        });
      });
    });
  };

  var digestMeasuresBox, digestTmplData;
  temp.panelActions.digestMeasures = function () {
    var messageData = this.message.data;
    digestMeasuresBox = digestMeasuresBox || $('.digestMeasuresBox');
    digestTmplData = digestTmplData || [];
    digestTmplData.push(messageData);
    digestMeasuresBox.data('tmplData', digestTmplData);
    // attribute update triggers template to render with new data
    digestMeasuresBox.attr('data-include-html', 'partials/digestMeasures.html');
  };


  var panelBuilder = birbalJS.actionBuilder.build(temp.panelActions);
  // deleting it as no longer needed.
  delete temp.panelActions;

  locallog('prepare for message listener ');
  /////////////////////////////////////////////////////////
  //            BG message listener
  /////////////////////////////////////////////////////////
  backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
    // in background message listener
    locallog('bgMsgListener');
    var actionBuilder =
      new panelBuilder(message, backgroundConnection, birbalJS.END_POINTS.PANEL, sender, sendResponse);
    actionBuilder.takeAction();
    locallog('background connection, msg action status? ' + actionBuilder.status());
  });

  // default first message on inspect tab load, letting app know I'm ready
  // send after listener setup
  informBackground(null, 'init', birbalJS.END_POINTS.BACKGROUND);
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////
  $('LI A#disableplugin').on('click', function (event) {
    clearResources();
    informBackground(null, 'disableme', birbalJS.END_POINTS.BACKGROUND);
  });

  var clearResources = function () {
    // digest records
    digestMeasuresBox = digestTmplData = undefined;
  };

  // proxy log to background
  birbalJS.proxylog = function (anymessage) {
    informBackground({
      log: anymessage
    }, 'log', birbalJS.END_POINTS.BACKGROUND);
  };

}(chrome, birbalJS, window));
