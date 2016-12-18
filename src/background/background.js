/*global chrome,birbalJS, window*/
(function (chrome, birbalJS) {
    'use strict';

    // all scripts gets reloaded after long inactive state
    var logger, tabs, receiver, setPageAction;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR DEVELOPMENT ONLY
    /////////////////////////////////////////////////////////
    function noop() {
        return;
    }

    if (birbalJS.debugMode) {
        logger = window.console;
    } else {
        // mock logger with noop()
        logger = {
            'log': noop,
            'info': noop,
            'debug': noop,
            'table': noop,
            'warn': window.console.warn.bind(console),
            'error': window.console.error.bind(console)
        };
    }
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////
    logger.log('background.js loading');

    /////////////////////////////////////////////////////////
    //            TABS - CONNECTIONS and PROTOTYPE
    /////////////////////////////////////////////////////////
    function TabsImpl() {
        var tabself = this, tabHolder = {};

        Object.defineProperty(tabself, 'length', {
            get: function () {
                return Object.keys(tabHolder).length;
            }
        });

        tabself.getTabInfo = function (tabId) {
            return tabHolder[tabId] && tabHolder[tabId].info;
        };

        tabself.getPort = function (tabId, portName) {
            return portName && tabHolder[tabId] && tabHolder[tabId][portName];
        };

        tabself.addPort = function (tabId, port, portName) {
            // add connection to tabs
            tabHolder[tabId] = tabHolder[tabId] || {info: {}};
            tabHolder[tabId][portName] = port;
        };

        tabself.removePort = function (portOrTabId, portName) {
            var port = isNaN(portOrTabId) ? portOrTabId : undefined,
                tabId = (port && port.sender.tab && port.sender.tab.id) || portOrTabId,
                tab;

            // delete connection
            if (tabId && tabHolder[tabId]) {
                delete tabHolder[tabId][portName];
            } else if (port) {
                // unlikely need of this block
                // tabId is not available
                // iterate through and delete
                for (tab in tabHolder) {
                    if (tabHolder.hasOwnProperty(tab) && tabHolder[tab][portName] === port) {
                        tabId = tab;
                        delete tabHolder[tab][portName];
                        break;
                    }
                }
            }

            if (tabId && !tabHolder[tabId][birbalJS.END_POINTS.PANEL] && !tabHolder[tabId][birbalJS.END_POINTS.CONTENTSCRIPT]) {
                // clean up tab resource
                delete tabHolder[tabId];
            }
            // removed tabId
            return tabId;
        };
    }

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////////////////
    //            communication - content-script & panel
    /////////////////////////////////////////////////////////////////////////////////////
    /**
     * sends call message to devtool panel
     * @param tabId{number} must
     * @param info{object} must
     * @param task{string} optional
     */
    function informPanel(tabId, info, task) {
        var panelPort, msg;

        panelPort = tabs.getPort(tabId, birbalJS.END_POINTS.PANEL);
        msg = new birbalJS.Message(info, birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.PANEL, task);
        if (panelPort) {
            panelPort.postMessage(msg);
        } else {
            logger.warn('WARNING: panel tab Connection doesnot exists. incorrect tabId or connection is closed. Retry later. message tried....');
        }
        logger.log(msg);
    }

    /**
     * sends call message to content-script
     * @param tabId{number} must
     * @param info{object} must
     * @param task{string} optional
     */
    function informContentScript(tabId, info, task) {
        var csPort, msg;

        csPort = tabs.getPort(tabId, birbalJS.END_POINTS.CONTENTSCRIPT);
        msg = new birbalJS.Message(info, birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.CONTENTSCRIPT, task);
        if (csPort) {
            csPort.postMessage(msg);
        } else {
            logger.error('SEVERE ERROR: content script tab Connection doesnot exists. incorrect tabId #' + tabId + '. Connection is closed. Cleaning resource......');
        }
        logger.log(msg);
    }

    /**
     * sends call message to http popup
     * @param tabId{number} must
     * @param info{object} must
     * @param task{string} optional
     */
    function informPopupHttp(tabId, info, task) {
        var popupPort, msg;

        popupPort = tabs.getPort(tabId, birbalJS.END_POINTS.POPUP_HTTP);
        msg = new birbalJS.Message(info, birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.POPUP_HTTP, task);
        if (popupPort) {
            popupPort.postMessage(msg);
        } else {
            logger.error('SEVERE ERROR: pop up in tab Connection doesnot exists. incorrect tabId #' + tabId + '. Connection is closed. Cleaning resource......');
            tabs.removePort(tabId, birbalJS.END_POINTS.POPUP_HTTP);
        }
        logger.log(msg);
    }

    /////////////////////////////////////////////////////////
    //            receiver action listener for task
    /////////////////////////////////////////////////////////
    receiver = new birbalJS.Receiver(birbalJS.END_POINTS.BACKGROUND);
    // for content-script
    // #9
    receiver.actionOnTask('csInit', function (message) {
        // if page refresh is mark, start analysis
        var tabInfo = tabs.getTabInfo(message.tabId);
        if (tabInfo.doAnalysis) {
            //informContentScript(message.tabId, tabInfo.ngDetect, 'startAnalysis');
            informPanel(message.tabId, tabInfo.ngDetect, 'addPanel');
        }
        setPageAction(message.tabId);
    });
    // #6
    receiver.actionOnTask('ngDetect', function (message) {
        var msgDetails, tabInfo, taskForpanel;

        // qq: what about other tabInfo of old tab?
        msgDetails = message.msgDetails;
        tabInfo = tabs.getTabInfo(message.tabId);
        tabInfo.ngDetect = msgDetails;
        // angular page >> add , not angular page >> remove
        //taskForpanel = msgDetails.ngDetected ? 'addPanel' : 'removePanel';
        informPanel(message.tabId, msgDetails, 'ngDetectData');
        setPageAction(message.tabId);
    });

    receiver.actionOnTask('dependencyTree', function (message) {
        var tabInfo;
        tabInfo = tabs.getTabInfo(message.tabId);
        tabInfo.dependencyTree = message.msgDetails;
        informPanel(message.tabId, tabInfo.dependencyTree, 'dependencyTree');
    });

    // for devtools panel
    // #7
    receiver.actionOnTask('panelInit', function (message) {
        // run pending tasks
        var tabInfo, taskForPanel;

        tabInfo = tabs.getTabInfo(message.tabId);
        // addPanel >> show angular detection and allow to start
        // removePanel >> reset panel
        taskForPanel = tabInfo.ngDetect && tabInfo.ngDetect.ngDetected ? 'addPanel' : 'removePanel';
        informPanel(message.tabId, tabInfo.ngDetect, taskForPanel);
        informPanel(message.tabId, tabInfo.dependencyTree, 'dependencyTree');
    });

    // #8
    receiver.actionOnTask('doAnalysis', function (message) {
        // enable or disable
        var tabInfo = tabs.getTabInfo(message.tabId);
        tabInfo.doAnalysis = message.msgDetails.doAnalysis;
        informContentScript(message.tabId, {
            'ngStart': tabInfo.doAnalysis,
            'ngModule': tabInfo.ngDetect.ngModule
        }, 'instrumentNg');
    });

    // for http popup in tab
    // #9
    receiver.actionOnTask('popupInit', function (message) {
        var tabInfo = tabs.getTabInfo(message.tabId);
        logger.log.bind(logger, 'popup init ').call(logger,message);
        tabInfo.mockHttp = tabInfo.mockHttp || {list: [], isModified: true};
    });
    // #10
    receiver.actionOnTask('retrieveMockList', function (message) {
        var tabInfo = tabs.getTabInfo(message.tabId),
            list = tabInfo.mockHttp && tabInfo.mockHttp.list;
        logger.table.bind(logger, 'responding with mock list- ').call(logger,list);
        informPopupHttp(message.tabId, list, message.task + "-response");
    });

    // #11
    receiver.actionOnTask('updateMockList', function (message) {
        var tabInfo = tabs.getTabInfo(message.tabId);
        tabInfo.mockHttp = tabInfo.mockHttp || {};
        tabInfo.mockHttp.isModified = true;
        tabInfo.mockHttp.list = message.msgDetails;
        logger.table.bind(logger, 'updating mock list-  ').call(logger,message.msgDetails);
    });

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    // init tabs as extension loaded
    tabs = new TabsImpl();
    /////////////////////////////////////////////////////////
    //            On port connection
    /////////////////////////////////////////////////////////
    /*jslint unparam: true*/
    function destinationPortFinder(message, sender, srcPort) {
        tabs.addPort(message.tabId, srcPort, message.callerId);
        return tabs.getPort(message.tabId, message.receiverId);
    }

    /*jslint unparam: false*/
    // #3
    // Fired when a connection is made from either an extension process or a content script.
    // on reload of page, reopen of page, new connection, etc.
    chrome.runtime.onConnect.addListener(function onConnectCallback(connectingPort) {
        logger.log('onConnectCallback, connectingPort-' + connectingPort.name);
        if (connectingPort.sender && connectingPort.sender.tab && connectingPort.sender.tab.id > 0) {
            // content script
            var tabInfo,
                tabId = connectingPort.sender.tab.id;
            tabs.addPort(tabId, connectingPort, connectingPort.name);
            tabInfo = tabs.getTabInfo(tabId);
            if (tabInfo.doAnalysis) {
                informContentScript(tabId, {
                    'ngStart': tabInfo.doAnalysis,
                    'ngModule': tabInfo.ngDetect.ngModule
                }, 'instrumentNg');
            }
        }

        /**
         * Bind connection,  message, events
         * @property onMessage event
         */
        connectingPort.onMessage.addListener(function messageListener(message, sender) {
            receiver.answerCall(message, sender, connectingPort, destinationPortFinder);
        });

        function handlePopupDisconnection(tabId) {
            if (connectingPort.name === birbalJS.END_POINTS.POPUP_HTTP) {
                logger.log('popup http is disconnected.');
                var tabInfo = tabs.getTabInfo(tabId);
                tabInfo.mockHttp = tabInfo.mockHttp || {list: [], isModified: true};
                if (tabInfo.mockHttp.isModified) {
                    logger.log('sending injector the updated list.');
                    tabInfo.mockHttp.isModified = false;
                    informContentScript(tabId, tabInfo.mockHttp.list, 'mockHttplist');
                }
            }
        }

        // #20
        /**
         * disconnect event
         * @property onDisconnect event
         */
        connectingPort.onDisconnect.addListener(function onDisconnectCallback(disconnectingPort) {
            logger.log('onDisconnectCallback');
            var tabId = tabs.removePort(disconnectingPort, connectingPort.name);
            handlePopupDisconnection(tabId);
            // notify other connections to same tab
            logger.log(tabs.length + ' - After DisconnectCallback, removed tab #' + tabId + ': ' + connectingPort.name);
        });
        /////////////////////////////////
    });

    setPageAction = function (tabId) {
        var tabInfo = tabs.getTabInfo(tabId);
        if (tabInfo && tabInfo.ngDetect && tabInfo.ngDetect.ngDetected) {
            chrome.pageAction.show(tabId);
            chrome.pageAction.setPopup({"tabId": tabId, "popup": "src/popup/popup.html"});
        }
    };
    ///////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////
}(chrome, birbalJS));