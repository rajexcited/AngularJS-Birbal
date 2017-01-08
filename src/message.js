/*global chrome, window*/
(function (chrome) {
    'use strict';

    /////////////////////////////////////////////////////////
    //            define endpoints for message
    /////////////////////////////////////////////////////////
    var endPoints = {
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
    //  Call Constructor
    /////////////////////////////////////////////////////////
    function MessageImpl(msgDetails, callerId, receiverId, task) {
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
            delete msgDetails.tabId;
        }
        if (!callerId || !task) {
            throw new Error('callerId or task not defined');
        }
        if (tabId) {
            msgDetails = msgDetails.msgDetails;
            this.tabId = tabId;
        } else {
            this.tabId = window.chrome && window.chrome.devtools && window.chrome.devtools.inspectedWindow && window.chrome.devtools.inspectedWindow.tabId;
        }
        this.task = task;
        /* default is background */
        this.receiverId = receiverId || endPoints.BACKGROUND;
        this.msgDetails = msgDetails;
        this.callerId = callerId;
        this.status = 'prepare';
        this.app = 'birbal';
    }


    function CallsHolderImpl() {
        var self = this,
            mapWithString = {},
            listWithRegex = [];

        function getListenersFromMap(key) {
            var list = [];
            if (mapWithString.hasOwnProperty(key)) {
                list = mapWithString[key];
            }
            return list;
        }

        function getListenersIndexFromRegexList(regexKey, isRegex) {
            var ind = -1,
                list = listWithRegex
                    .filter(function (item, index) {
                        if (isRegex && item.key === regexKey) {
                            ind = index;
                            return true;
                        }
                        return (!isRegex && item.key.test(regexKey));
                    })
                    .map(function (item) {
                        return item.value;
                    });
            list = Array.prototype.concat.apply([], list);
            if (isRegex) {
                return ({
                    ind: ind,
                    list: list
                });
            }
            return list;
        }

        self.addListener = function (stringOrRegex, value) {
            var listeners = [];
            if (stringOrRegex instanceof RegExp) {
                listeners = getListenersIndexFromRegexList(stringOrRegex, true);
                listeners.list.push(value);
                if (listeners.ind !== -1) {
                    listWithRegex[listeners.ind] = listeners.list;
                } else {
                    listWithRegex.push({
                        key: stringOrRegex,
                        value: listeners.list
                    });
                }
            } else {
                listeners = getListenersFromMap(stringOrRegex);
                listeners.push(value);
                mapWithString[stringOrRegex] = listeners;
            }
        };

        self.hasListener = function (stringOrRegex) {
            var listeners = self.getAllListeners(stringOrRegex);
            return (listeners.length !== 0);
        };

        self.getAllListeners = function (stringOrRegex) {
            return getListenersFromMap(stringOrRegex).concat(getListenersIndexFromRegexList(stringOrRegex, false));
        }
    }

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
    function ReceiverImpl(receiverId) {
        var receiverSelf = this,
        /* namespace calls will have call/task name - listener mapping */
            calls = new CallsHolderImpl();
        receiverSelf.receiverId = receiverId;

        receiverSelf.for = function (callIdStringOrRegex, callListener) {
            if ((typeof callIdStringOrRegex !== 'string' || callIdStringOrRegex instanceof RegExp) && typeof callListener !== 'function') {
                throw new Error('arguments task/ call Id and call Listener are not matching');
            }
            calls.addListener(callIdStringOrRegex, callListener);
            /*var listeners = calls[callIdStringOrRegex] = (calls[callIdStringOrRegex] || []);
             listeners.push(callListener);*/
        };

        /* can have more arguments, only required args are here */
        receiverSelf.answerCall = function (message, sender, srcPort, destPort) {

            function executeCallListeners() {
                var callListeners = calls.getAllListeners(message.task);
                callListeners.forEach(function (listener) {
                    listener(message);
                });
                return callListeners.length;
            }

            message.status = 'connecting';
            message.tabId = message.tabId || (srcPort && srcPort.sender && srcPort.sender.tab && srcPort.sender.tab.id);

            if (typeof destPort === 'function') {
                /* get port in background */
                destPort = destPort.apply(null, arguments);
            }
            if (!destPort || srcPort.name === receiverSelf.receiverId || destPort.name === receiverSelf.receiverId || destPort === receiverSelf.receiverId) {
                if (executeCallListeners().length === 0) {
                    throw new Error('given task:"' + message.task + '" is not registered with action callback.');
                }
                message.status = 'answered';
            } else {
                /* intercept, update details and delegate */
                if (executeCallListeners().length !== 0) {
                    message.interceptedBy = (message.interceptedBy || []).concat(receiverSelf.receiverId);
                }
                /* delegates message to destPort */
                destPort.postMessage(message);
            }
        };
    }

    /////////////////////////////////////////////////////////
    //            share birbalJS
    /////////////////////////////////////////////////////////
    // creating prototype
    function BirbalJSImpl() {
        this.END_POINTS = endPoints;
        // true for development only
        // true - allows to log info and trace app behavior
        this.debugMode = false;
        // call is used in sending message
        this.Message = MessageImpl;
        this.Receiver = ReceiverImpl;
    }

    // sharable and used across all layers
    window.birbalJS = new BirbalJSImpl();
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

}(chrome));
