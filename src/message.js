/*global chrome, window*/
(function (chrome) {
    'use strict';

    var BirbalJSImpl, endPoints, MessageImpl, ReceiverImpl;
    /////////////////////////////////////////////////////////
    //            define endpoints for message
    /////////////////////////////////////////////////////////
    endPoints = {
        PANEL: 'panel',
        BACKGROUND: 'background',
        CONTENTSCRIPT: 'content-script',
        ANGULARINSPECTOR: 'angular-inspector'
    };

    /////////////////////////////////////////////////////////
    //  phone dials and receives call
    //  call carries message and ids
    //  message carries data
    //  person processes message
    //
    //  call has callerId, receiverId, page/tabId, callStatus, message, app
    //  message has task, data, etc.
    //
    //  call status -  prepare, dial, connecting, answered
    /////////////////////////////////////////////////////////
    //  Call Consructor
    /////////////////////////////////////////////////////////
    MessageImpl = function (msgDetails, callerId, receiverId, task) {
        if (msgDetails) {
            if (!task) {
                task = msgDetails.task;
                delete msgDetails.task;
            }
            if (!callerId) {
                callerId = msgDetails.callerId;
                delete msgDetails.callerId;
            }
            if (!receiverId) {
                receiverId = msgDetails.receiverId;
                delete msgDetails.receiverId;
            }
        }
        if (!callerId || !task) {
            throw new Error('callerId or task not defined');
        }
        var chrome = window.chrome;
        this.tabId = chrome && chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.tabId;
        this.callerId = callerId;
        /* default is background */
        this.receiverId = receiverId || endPoints.BACKGROUND;
        this.status = 'prepare';
        this.app = 'birbal';
        this.msgDetails = msgDetails;
        this.task = task;
    };
    /////////////////////////////////////////////////////////
    //  receiver changes call status
    //  receiver registers taskAction
    //  receiver finds task appropriately and answer it,
    //  receiver looks for receiverId and transfers to it
    //  receiver discards the call if it does not find registered task and logs to console.
    /////////////////////////////////////////////////////////
    //            Receiver Constructor
    /////////////////////////////////////////////////////////
    ReceiverImpl = function (receiverId) {
        var receiverSelf = this,
            taskCallBackList = {};
        receiverSelf.receiverId = receiverId;

        receiverSelf.actionOnTask = function (task, actionCallBack) {
            if (typeof task !== 'string' && typeof actionCallBack !== 'function') {
                throw new Error('arguments(task, actionCallBack) are not matching');
            }
            taskCallBackList[task] = actionCallBack;
        };

        // can have more arguments, only required args are here
        receiverSelf.answerCall = function (message, sender, srcPort, destPort) {
            message.status = 'connecting';
            message.tabId = message.tabId || (srcPort.sender && srcPort.sender.tab && srcPort.sender.tab.id);

            if (typeof destPort === 'function') {
                // used in background
                destPort = destPort.apply(null, arguments);
            }
            if (srcPort.name === receiverSelf.receiverId || !destPort || destPort.name === receiverSelf.receiverId || destPort === receiverSelf.receiverId) {
                var taskName, callback;
                taskName = message.task;
                callback = taskCallBackList[taskName];
                if (!callback) {
                    throw new Error('given task:"' + taskName + '" is not registered with action callback.');
                }
                callback.apply(null, arguments);
                message.status = 'answered';
            } else {
                // delegates message to destPort
                destPort.postMessage(message);
            }
        };
        ///
    };
    /////////////////////////////////////////////////////////
    //            share birbalJS
    /////////////////////////////////////////////////////////
    // creating prototype
    BirbalJSImpl = function () {
        var self = this;
        self.END_POINTS = endPoints;
        // true for development only    // try to get from config
        self.debugMode = false;
        // call is used in sending message
        self.Message = MessageImpl;
        self.Receiver = ReceiverImpl;
    };

    // share
    window.birbalJS = new BirbalJSImpl();
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

}(chrome));
