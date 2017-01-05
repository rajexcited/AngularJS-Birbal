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
        ANGULARINSPECTOR: 'angular-inspector',
        POPUP_HTTP: 'http-mock-popup'
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
        var tabId;
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
            tabId = msgDetails.tabId;
        }
        if (!callerId || !task) {
            throw new Error('callerId or task not defined');
        }
        if (tabId) {
            msgDetails = msgDetails.info;
            this.tabId = tabId;
        } else {
            var chrome = window.chrome;
            this.tabId = chrome && chrome.devtools && chrome.devtools.inspectedWindow && chrome.devtools.inspectedWindow.tabId;
        }
        this.task = task;
        /* default is background */
        this.receiverId = receiverId || endPoints.BACKGROUND;
        this.msgDetails = msgDetails;
        this.callerId = callerId;
        this.status = 'prepare';
        this.app = 'birbal';
    };
    /////////////////////////////////////////////////////////
    //  receiver changes call status
    //  receiver registers taskAction
    //  receiver finds task appropriately and answer it,
    //  receiver task can be intercepted by background but not answerable by Background,
    //  receiver looks for receiverId and transfers to it
    //  receiver discards the call if it does not find registered task and logs to console.
    /////////////////////////////////////////////////////////
    //            Receiver Constructor
    /////////////////////////////////////////////////////////
    ReceiverImpl = function (receiverId) {
        var receiverSelf = this,
        /* namespace calls will have call/task name - listener mapping */
            calls = {},
        /*namespace*/
            taskCallBackList = {};
        receiverSelf.receiverId = receiverId;

        receiverSelf.when = function (callId, callListener) {
            if (typeof taskOrCall !== 'string' && typeof callListener !== 'function') {
                throw new Error('arguments task/ call Id and call Listener are not matching');
            }
            var listeners = calls[callId] = (calls[callId] || []);
            listeners.push(callListener);
        };
        //receiverSelf.when = function (task, actionCallBack) {
        //    if (typeof task !== 'string' && typeof actionCallBack !== 'function') {
        //        throw new Error('arguments(task, actionCallBack) are not matching');
        //    }
        //    taskCallBackList[task] = actionCallBack;
        //};

        /* can have more arguments, only required args are here */
        receiverSelf.answerCall = function (message, sender, srcPort, destPort) {
            var callListeners, newMessageDetails;
            message.status = 'connecting';
            message.tabId = message.tabId || (srcPort && srcPort.sender && srcPort.sender.tab && srcPort.sender.tab.id);

            if (typeof destPort === 'function') {
                /* get port in background */
                destPort = destPort.apply(null, arguments);
            }
            if (!destPort || srcPort.name === receiverSelf.receiverId || destPort.name === receiverSelf.receiverId || destPort === receiverSelf.receiverId) {
                callListeners = taskCallBackList[message.task];
                if (!callListeners) {
                    throw new Error('given task:"' + message.task + '" is not registered with action callback.');
                }
                callListeners.forEach(function (listener) {
                    listener(message);
                });
                message.status = 'answered';
            } else {
                /* intercept, update details and delegate */
                callListeners = taskCallBackList[message.task];
                if (callListeners) {
                    callListeners.forEach(function (listener) {
                        listener(message);
                    });
                    message.interceptedBy = receiverSelf.receiverId;
                }
                /* delegates message to destPort */
                destPort.postMessage(message);
            }
        };
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
