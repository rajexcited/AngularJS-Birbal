/*global chrome,birbalJS*/
(function (chrome, birbalJS) {
    'use strict';

    // all scripts gets reloaded after long inactive state
    var logger, temp = {};
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
    /////////////////////////////////////////////////////////
    logger.log('background.js loading');

    /////////////////////////////////////////////////////////
    //            TABS - CONNECTIONS and PROTOTYPE
    /////////////////////////////////////////////////////////
    var tabs,
        TabsProto = function () {
        };
    // tab prototype
    TabsProto.prototype = {

        getPort: function (tabId, portName) {
            return portName && this[tabId] && this[tabId][portName];
        },

        addPort: function (tabId, port, portName) {
            // add connection to tabs
            var tab = this[tabId] = this[tabId] ? (this.length && this[tabId]) : (this.length++ && {});
            tab[portName] = port;
            tab.info = (tab.info || {});
        },

        removePort: function (port, portName) {
            var tabId = port.sender.tab && port.sender.tab.id;

            // delete connection
            if (tabId in this) {
                delete this[tabId][portName];
            } else {
                // tabId is not available
                // iterate through and delete
                var allTabIds = Object.keys(this),
                    len = allTabIds.length,
                    i;

                for (i = 0; i < len; i++) {
                    tabId = allTabIds[i];
                    if (this[tabId][portName] === port) {
                        delete this[tabId][portName];
                        break;
                    }
                }
                if (i === len) {
                    tabId = undefined;
                }
            }
            if (!this[tabId][birbalJS.END_POINTS.PANEL] && !this[tabId][birbalJS.END_POINTS.CONTENTSCRIPT]) {
                // clean up tab resource
                this.removeTab(tabId);
            }
            // removed
            return tabId;
        },
        /////////////////////
        removeTab: function (tabId) {
            delete this[tabId];
            this.length--;
            return this.length;
            // notify others and cleanup connection
        },

        length: 0
    };
    tabs = new TabsProto();
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////////////////
    //            communication - content-script & panel
    /////////////////////////////////////////////////////////////////////////////////////
    var PanelMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.PANEL);
    var informPanel = function (tabId, info, task) {
        var tab = tabs.getPort(tabId, birbalJS.END_POINTS.PANEL);
        var msg = new PanelMessage(info);
        msg.task = task || msg.task;
        if (tab) {
            logger.log(msg);
            tab.postMessage(msg);
        } else {
            logger.warn(
                'WARNING: panel tab Connection doesnot exists. incorrect tabId or connection is closed. Retry later. message tried....'
            );
            logger.log(msg);
        }
    };

    var ContentMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.CONTENTSCRIPT);
    /**
     send information to content-script.
     @param tabId{number} must
     @param info{object} must
     @param task{string} optional
     */
    var informContentScript = function (tabId, info, task) {
        var tab = tabs.getPort(tabId, birbalJS.END_POINTS.CONTENTSCRIPT);
        var msg = new ContentMessage(info);
        msg.task = task || msg.task;
        if (tab) {
            logger.log(msg);
            tab.postMessage(msg);
        } else {
            tabs.removeTab(tabId);
            logger.error(
                'SEVERE ERROR: content script tab Connection doesnot exists. incorrect tabId #' + tabId +
                '. Connection is closed. Cleaning resource......');
            logger.log(msg);
        }
    };

    /////////////////////////////////////////////////////////
    //            content-script actionBuilder
    /////////////////////////////////////////////////////////
    temp.csActions = {};
    temp.csActions.init = function () {
        // if page refresh is mark, start analysis
        this.status('csinit');
        var tab = tabs[this.tabId];
        if (tab.info.doAnalysis) {
            informContentScript(this.tabId, tab.info.ngDetect, 'startAnalysis');
            this.status('calling startAnalysis');
            // ignore this message now
            //informPanel(this.tabId, null, 'refresh');
            //this.status('');
        }
    };

    temp.csActions.ngDetect = function () {
        var messageData = this.message.data,
            tab = tabs[this.tabId];
        this.status('ngDetect');
        tab.info.ngDetect = messageData;
        // angular page >> add , not angular page >> remove
        var taskForpanel = messageData.ngDetected ? 'addPanel' : 'removePanel';
        informPanel(this.tabId, messageData, taskForpanel);
        this.status(taskForpanel);
    };

    var CsActionBuilder = birbalJS.actionBuilder.build(temp.csActions);
    // deleting it as no longer needed.
    delete temp.csActions;

    /////////////////////////////////////////////////////////
    //            panel actionBuilder
    /////////////////////////////////////////////////////////
    temp.panelActions = {};
    temp.panelActions.init = function () {
        // run pending tasks
        var tab = tabs[this.tabId],
            ngDetect = tab.info.ngDetect;
        this.status('panel-init');
        var task = ngDetect && ngDetect.ngDetected ? 'addPanel' : 'removePanel';
        informPanel(this.tabId, ngDetect, task);
        this.status(task);
    };

    temp.panelActions.stopAnalysis = function () {
        // disable further analysis
        this.doAnalysis();
        // init panel
        this.init();
        // stop analysis in Injected
        informContentScript(this.tabId, null, 'stopAnalysis');
    };

    temp.panelActions.doAnalysis = function () {
        var tab = tabs[this.tabId];
        tab.info.doAnalysis = this.message.data.doAnalysis;
    };

    var PanelActionBuilder = birbalJS.actionBuilder.build(temp.panelActions);
    // deleting it as no longer needed.
    delete temp.panelActions;
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    // Fired when the extension is first installed, when the extension is updated to a new version, and when Chrome is updated to a new version.
    chrome.runtime.onInstalled.addListener(function onInstalledCallback(details) {
        logger.log('on' + details.reason + 'Callback: ');
        logger.log(details);
        // on update or reload, cleanup and restart.
    });

    /////////////////////////////////////////////////////////
    //            On port connection
    /////////////////////////////////////////////////////////
    function panelMsgListener(connectingPort, message, sender, sendResponse) {
        // logger.log('panelMsgListener');
        var builder = new PanelActionBuilder(message, connectingPort, birbalJS.END_POINTS.BACKGROUND, sender, sendResponse);
        // adding port if not exists
        tabs.addPort(builder.tabId, connectingPort, birbalJS.END_POINTS.PANEL);
        builder.destPort = tabs.getPort(builder.tabId, message.dest);
        builder.takeAction();
        logger.log('panel #' + builder.tabId + ' msg action status? ' + builder.status());
    }

    function contentScriptMsgListener(message, sender, sendResponse) {
        // logger.log('contentScriptMsgListener');
        var builder = new CsActionBuilder(message, sender, birbalJS.END_POINTS.BACKGROUND, sender, sendResponse);
        // adding port if not exists
        tabs.addPort(builder.tabId, sender, birbalJS.END_POINTS.CONTENTSCRIPT);
        builder.destPort = tabs.getPort(builder.tabId, message.dest);
        builder.takeAction();
        logger.log('content-script #' + builder.tabId + ' msg action status? ' + builder.status());
    }

    // trying to make it stateless and less closures to improve memory usage
    function onConnectCallback(connectingPort) {
        logger.log('onConnectCallback, connectingPort-' + connectingPort.name);
        var connectionName = connectingPort.name;

        var msgListener;
        if (connectionName === birbalJS.END_POINTS.PANEL) {
            msgListener = function msgListenerForPanel(message, sender, sendResponse) {
                panelMsgListener(connectingPort, message, sender, sendResponse);
            };
        } else if (connectionName === birbalJS.END_POINTS.CONTENTSCRIPT) {
            msgListener = contentScriptMsgListener;
        }

        function onDisconnectCallback(disconnectingPort) {
            logger.log('onDisconnectCallback');
            var tabId = tabs.removePort(disconnectingPort, connectionName);
            // notify other connections to same tab
            // cleanup for disconnectingPort
            disconnectingPort.onMessage.removeListener(msgListener);
            logger.log(tabs.length + ' - After DisconnectCallback, removed tab #' + tabId + ': ' + connectionName);
        }

        // Bind connection,  message, events
        connectingPort.onMessage.addListener(msgListener);
        connectingPort.onDisconnect.addListener(onDisconnectCallback);

        /////////////////////////////////
    }

    // Fired when a connection is made from either an extension process or a content script.
    // on reload of page, reopen of page, new connection, etc.
    chrome.runtime.onConnect.addListener(onConnectCallback);
    ///////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////

})(chrome, birbalJS);