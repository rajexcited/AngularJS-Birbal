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
    self.message = message;
    self.srcPort = srcPort;
    self.destPort = destPort;
    self.sender = sender;
    self.sendResponse = sendResponse;
    self.tabId = self.message.tabId || (self.srcPort.sender && self.srcPort.sender.tab && self.srcPort.sender.tab.id);
    // status is used to track actions
    self._status = 'ready';
  };

  // priority to log message
  // 1. logMsg
  // 2. data log
  // 3. data
  // 4. message
  basicMessageExecutor.prototype.log = function (logMsg) {
    logMsg = logMsg || (self.message.data && self.message.data.log) || self.message.data || self.message;
    locallog(logMsg);
    self.status('logged');
  };

  /**
    works as getter and setter
  */
  basicMessageExecutor.prototype.status = function (_status) {
    if (_status) {
      self._status.concat(', ' + _status);
    }
    return self._status;
  };

  basicMessageExecutor.prototype.takeAction = function () {
    // execute given message
    // this.status = 'takingAction';
    if (!self.destPort || self.destPort === self.srcPort || self.destPort === self.srcPort.name) {
      self.status('finish');
      self[self.message.task]();
    } else {
      locallog(
        'delegating message to correct destPort....here acting as a median'
      );
      self.destPort.postMessage(self.message);
      self.status('delegated');
    }
  };

  // to build new prototype with additional actions
  basicMessageExecutor.__proto__ = function basicMessageProto() {};
  basicMessageExecutor.__proto__.build = function (newActions) {
    // newActions should be object
    var actions = Object.getOwnPropertyNames(newActions);
    var newproto = Object.create(this.prototype);
    var action, ind, len = actions.length;
    // add actions
    for (ind = 0; ind < len; ind++) {
      action = actions[ind];
      newproto[action] = newActions[action];
    }
    var basicMessageExecutorImpl = function (message, srcPort, destPort, sender, sendResponse) {
      basicMessageExecutor.prototype.self = this;
      basicMessageExecutor.call(this, message, srcPort, destPort, sender, sendResponse);
    };
    basicMessageExecutorImpl.prototype = newproto;
    return basicMessageExecutorImpl;
  };

  birbalJS.actionBuilder = basicMessageExecutor;

})(chrome, birbalJS);
