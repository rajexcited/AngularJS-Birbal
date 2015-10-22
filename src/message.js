(function (chrome) {
  'use script';

  /////////////////////////////////////////////////////////
  //            define endpoints for message
  /////////////////////////////////////////////////////////
  var endPoints = {
    PANEL: 'panel',
    BACKGROUND: 'background',
    CONTENTSCRIPT: 'content-script'
  };
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////


  /////////////////////////////////////////////////////////
  //            message constructor
  /////////////////////////////////////////////////////////
  var messageImpl = function (msgDetails) {
    self.tabId = chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.tabId;
    // add details to data
    self.data = msgDetails;
    if (msgDetails) {
      self.task = msgDetails.task;
      delete msgDetails.task;
    }
  };

  var getMessageBuilder = function (srcChannel, destEndPoint) {
    return function message(msgDetails) {
      self = this;
      self.source = srcChannel;
      self.dest = destEndPoint || endPoints.BACKGROUND;
      self.name = 'birbalMessage';
      messageImpl.call(self, msgDetails);
    };
  };
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////


  /////////////////////////////////////////////////////////
  //            share birbalJS
  /////////////////////////////////////////////////////////
  // creating prototype
  var BirbalJS = function () {
    self = this;
    self.END_POINTS = endPoints;
    // true for development only
    self.debugMode = true;
  };
  BirbalJS.prototype.messageBuilder = getMessageBuilder;
  // handles event - jquery event wrapper if needed
  BirbalJS.prototype.on = function (eventName, callback, context) {
    // ignore if callback is not defined
    if (typeof callback !== 'function') {
      return;
    }

    if (eventName === 'documentLoad') {
      // on document or window load
      if (document.readyState === 'complete') {
        window.setTimeout(function () {
          // console.log('dom ready');
          // console.time('dom');
          $(document).trigger(eventName);
        }, 0);
      } else {
        window.addEventListener('load', function () {
          window.setTimeout(function () {
            // console.log('window load');
            // console.timeEnd('dom');
            $(document).trigger(eventName);
          }, 0);
        }, false);
      }
      ////// end of eventName:documentLoad
    }
    // use jquery events
    // register callback withjquery event
    context = context || document;
    $(document).on(eventName, callback);
  };

  // share
  window.birbalJS = new BirbalJS();
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////

})(chrome);
