(function (chrome) {
  'use script';

  /////////////////////////////////////////////////////////
  //            define endpoints for message
  /////////////////////////////////////////////////////////
  var endPoints = {
    DEVTOOLS: 'devtools-page',
    BACKGROUND: 'background',
    CONTENTSCRIPT: 'content-script'
  };
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////


  /////////////////////////////////////////////////////////
  //            message constructor
  /////////////////////////////////////////////////////////
  var messageImpl = function (msgDetails) {
    this.tabId = chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.tabId;
    // add details to data
    this.data = msgDetails;
    if (msgDetails) {
      this.task = msgDetails.task;
      delete msgDetails.task;
    }
  };

  var getMessageBuilder = function (srcChannel, destEndPoint) {
    return function message(msgDetails) {
      this.source = srcChannel;
      this.dest = destEndPoint || endPoints.BACKGROUND;
      this.name = 'birbalMessage';
      messageImpl.call(this, msgDetails);
    };
  };
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////


  /////////////////////////////////////////////////////////
  //            share birbalJS
  /////////////////////////////////////////////////////////
  // creating prototype
  var BirbalJS = function () {
    this.END_POINTS = endPoints;
    // true for development only
    this.debugMode = true;
  };
  BirbalJS.prototype.messageBuilder = getMessageBuilder;
  // share
  window.birbalJS = new BirbalJS();
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////

})(chrome);
