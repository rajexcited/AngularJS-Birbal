/*global chrome, birbalJS*/
(function (chrome, birbalJS) {
    'use strict';

    var logger;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR DEVELOPMENT ONLY
    /////////////////////////////////////////////////////////
    function noop() {
    }

    if (birbalJS.debugMode) {
        logger = window.console;
    } else {
        // mock logger with noop()
        logger = {};
        ['log', 'warn', 'info', 'error', 'debug'].forEach(function (prop) {
            logger[prop] = noop;
        });
    }
    /////////////////////////////////////////////////////////
    //          message constructor
    /////////////////////////////////////////////////////////

    var basicMessageExecutor = function (message, srcPort, destPort, sender, sendResponse) {
        this.message = message;
        this.srcPort = srcPort;
        this.destPort = destPort;
        this.sender = sender;
        this.sendResponse = sendResponse;
        this.tabId = this.message.tabId || (this.srcPort.sender && this.srcPort.sender.tab && this.srcPort.sender.tab.id);
        // status is used to track actions
        this._status = 'ready';
    };

    /////////////////////////////////////////////////////////
    //          message common prototype
    /////////////////////////////////////////////////////////
    // priority to log message
    // 1. logMsg
    // 2. data log
    // 3. data
    // 4. message
    basicMessageExecutor.prototype.log = function (logMsg) {
        logMsg = logMsg || (this.message.data && (this.message.data.message || this.message.data.log)) || this.message.data || this.message;
        var type = (this.message.data && this.message.data.type) || 'log';
        logger[type].apply(logger, [logMsg]);
        this.status('logged');
    };

    /**
     works as getter and setter
     */
    basicMessageExecutor.prototype.status = function (_status) {
        if (_status) {
            this._status.concat(', ' + _status);
        }
        return this._status;
    };

    basicMessageExecutor.prototype.takeAction = function () {
        // execute given message
        // this.status = 'takingAction';
        if (!this.destPort || this.destPort === this.srcPort || this.destPort === this.srcPort.name) {
            this.status('finish');
            this.log(this.message);
            this[this.message.task]();
        } else {
            logger.log('delegating message to correct destPort....here acting as a median');
            this.destPort.postMessage(this.message);
            this.status('delegated');
        }
    };

    /////////////////////////////////////////////////////////
    //          extending message prototype
    /////////////////////////////////////////////////////////
    // to build new prototype with additional actions
    /*jshint -W103*/
    basicMessageExecutor.__proto__ = function basicMessageProto() {
    };
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
            basicMessageExecutor.call(this, message, srcPort, destPort, sender, sendResponse);
        };
        basicMessageExecutorImpl.prototype = newproto;
        return basicMessageExecutorImpl;
    };
    /*jshint +W103*/
    birbalJS.actionBuilder = basicMessageExecutor;
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

})(chrome, birbalJS);