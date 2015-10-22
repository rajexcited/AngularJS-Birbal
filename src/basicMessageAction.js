(function (chrome, birbalJS) {
  'use strict';

  /////////////////////////////////////////////////////////
  //            LOGGER FOR DEVELOPMENT ONLY
  /////////////////////////////////////////////////////////
  // define 'noop' by default
  var locallog = function () {};
  if (birbalJS.debugMode) {
    // assign console.log or proxy logs
    locallog = function (any) {
      console.log(any);
    }
  }
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////

  var basicMessageExecutor = function (message, srcPort, destPort, sender, sendResponse) {
    self = this;
    self.message = message;
    self.srcPort = srcPort;
    self.destPort = destPort;
    self.sender = sender;
    self.sendResponse = sendResponse;
    self.tabId = self.message.tabId || (self.srcPort.sender && self.srcPort.sender.tab && self.srcPort.sender.tab.id);
    // status is used to track actions
    self.status = 'ready';
  };

  // priority to log message
  // 1. logMsg
  // 2. data log
  // 3. data
  // 4. message
  basicMessageExecutor.prototype.log = function (logMsg) {
    logMsg = logMsg || (self.message.data && self.message.data.log) || self.message.data || self.message;
    locallog(logMsg);
    self.status = 'logged';
  };

  basicMessageExecutor.prototype.takeAction = function () {
    // execute given message
    // this.status = 'takingAction';
    if (!self.destPort || self.destPort === self.srcPort || self.destPort === self.srcPort.name) {
      self.status = 'finish';
      self[self.message.task]();
    } else {
      locallog(
        'delegating message to correct destPort....here acting as a median'
      );
      self.destPort.postMessage(self.message);
      self.status = 'delegated';
    }
  };

  // to build new prototype with additional actions
  basicMessageExecutor.__proto__ = function () {};
  basicMessageExecutor.__proto__.build = function (newActions) {
    self = this;
    // newActions should be object
    var actions = Object.getOwnPropertyNames(newActions);
    var newproto = Object.create(self.prototype);
    var action, ind, len = actions.length;
    // add actions
    for (ind = 0; ind < len; ind++) {
      action = actions[ind];
      newproto[action] = newActions[action];
    }
    var newProtoFn = function (message, srcPort, destPort, sender, sendResponse) {
      basicMessageExecutor.call(this, message, srcPort, destPort, sender, sendResponse);
    };
    newProtoFn.prototype = newproto;
    return newProtoFn;
  };
  // basicMessageExecutor.prototype
  // basicMessageExecutor.prototype

  birbalJS.actionBuilder = basicMessageExecutor;

})(chrome, birbalJS);
