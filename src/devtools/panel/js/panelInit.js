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
  var backgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.PANEL);
  var informBackground = function (info, task) {
    var msg = new backgroundMessage(info);
    msg.task = task || msg.task;
    backgroundConnection.postMessage(msg);
  };

  /////////////////////////////////////////////////////////
  //            panel actionBuilder
  /////////////////////////////////////////////////////////
  var temp = {};
  temp.panelActions = {};
  temp.panelActions.addPanel = function () {
    // initialize panel with graphs and information
    birbalJS.on('documentLoad', function (event) {
      var messageData = self.message.data || {};
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
      }

      contentBody.on('afterload', function (event, status) {
        // 'includeStatus'
        contentBody.find('BUTTON').on('click', onbuttonClickListener);
      });
      contentBody.attr('data-include-html', 'partials/initPage.html');
    });

    self.status('panelAdded');
  };

  temp.panelActions.removePanel = function () {
    // initialize panel with information and links to this project
    birbalJS.on('documentLoad', function (event) {
      var messageData = self.message.data || {};
      $('#contentBody').data({
        tmplData: messageData
      });
      $('#contentBody').attr('data-include-html', 'partials/initPage.html');
    });
    self.status('panelRemoved');
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
  informBackground(null, 'init');
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////

  // proxy log to background
  birbalJS.proxylog = function (anymessage) {
    informBackground({
      task: 'log',
      log: anymessage
    });
  };

})(chrome, birbalJS, window);
