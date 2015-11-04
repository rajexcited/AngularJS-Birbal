(function (chrome, birbalJS, window) {
  'use strict';
  angular.module('background-service-app', ['panel-actions-app'])
    .service('backgroundService', ['panelActions', function (panelActions) {
      /////////////////////////////////////////////////////////
      //            LOGGER FOR DEVELOPMENT ONLY
      /////////////////////////////////////////////////////////
      // define 'noop' by default
      var locallog,
        serviceInstance = this;

      locallog = function () {};
      if (birbalJS.debugMode) {
        // assign console.log or proxy logs
        locallog = function (any) {
          console.log(any);
        };
      }
      serviceInstance.locallog = birbalJS.locallog = locallog;

      /////////////////////////////////////////////////////////
      //            Background connection setup
      /////////////////////////////////////////////////////////
      // Create a connection to the background page
      var backgroundConnection = chrome.runtime.connect({
        name: birbalJS.END_POINTS.PANEL
      });

      locallog('prepare for init message to BG');
      var backgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.PANEL, birbalJS.END_POINTS.CONTENTSCRIPT);
      serviceInstance.informBackground = function (info, task, newDest) {
        var msg = new backgroundMessage(info);
        msg.task = task || msg.task;
        msg.dest = newDest || msg.dest;
        if (msg.task) {
          backgroundConnection.postMessage(msg);
        } else {
          console.error('task is not defined.');
        }
      };

      /////////////////////////////////////////////////////////
      //            BG message listener
      /////////////////////////////////////////////////////////
      backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
        // in background message listener
        locallog('in bgMsgListener');
        panelActions.perform(message, backgroundConnection, birbalJS.END_POINTS.PANEL, sender,
          sendResponse);
      });

      // proxy log to background
      serviceInstance.proxylog = birbalJS.proxylog = function (anymessage) {
        informBackground({
            log: anymessage
          },
          'log',
          birbalJS.END_POINTS.BACKGROUND);
      };
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////
    }]);
}(chrome, birbalJS, window));
