(function (chrome, birbalJS) {
	'use strict';

	// all scripts gets reloaded after long inactive state

	/////////////////////////////////////////////////////////
	//            LOGGER FOR DEVELOPMENT ONLY
	/////////////////////////////////////////////////////////
	// define 'noop' by default
	var locallog = function () {};
	if (birbalJS.debugMode) {
		locallog = function (any) {
			console.log(any);
		};
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	var temp = {};
	locallog('background.js loading');

	/////////////////////////////////////////////////////////
	//            TABS - CONNECTIONS and PROTOTYPE
	/////////////////////////////////////////////////////////
	var tabs = {};
	// tab prototype
	tabs.__proto__ = {
		getPort: function (tabId, portName) {
			return portName && this[tabId] && this[tabId][portName];
		},

		addPort: function (tabId, port, portName) {
			// add connection to tabs
			var tab = this[tabId] = (this[tabId] || {});
			tab[portName] = port;
		},

		removePort: function (port, portName) {
			var tabId = port.sender.tab && port.sender.tab.id;

			// delete connection
			if (tabId in tabs) {
				delete tabs[tabId][portName];
			} else {
				// iterate through and delete
				var allTabIds = Object.keys(tabs),
					len = allTabIds.length,
					i;

				for (i = 0; i < len; i++) {
					tabId = allTabIds[i];
					if (tabs[tabId] === port) {
						delete tabs[tabId][portName];
						break;
					}
				}
			}
			// removed
			return tabId;
		},
		/////////////////////
		removeTab: function (tabId) {
			delete tabs[tabId];
			// notify others and cleanup connection
		}
	};
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////


	/////////////////////////////////////////////////////////////////////////////////////
	//            communication - content-script & panel
	/////////////////////////////////////////////////////////////////////////////////////
	var panelMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.PANEL);
	var informPanel = function (tabId, info, task) {
		var tab = tabs.getPort(tabId, birbalJS.END_POINTS.PANEL);
		var msg = new panelMessage(info);
		msg.task = task || msg.task;
		if (tab) {
			tab.postMessage(msg);
		} else {
			locallog(
				'WARNING: panel tab Connection doesnot exists. incorrect tabId or connection is closed. Retry later. message tried....'
			);
			locallog(msg);
		}
	};

	var contentMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.BACKGROUND, birbalJS.END_POINTS.CONTENTSCRIPT);
	/**
		send information to content-script.
		@param tabId{number} must
		@param info{object} must
		@param task{string} optional
	*/
	var informContentScript = function (tabId, info, task) {
		var tab = tabs.getPort(tabId, birbalJS.END_POINTS.CONTENTSCRIPT);
		var msg = new contentMessage(info);
		msg.task = task || msg.task;
		if (tab) {
			tab.postMessage(msg);
		} else {
			tabs.removeTab(tabId);
			locallog(
				'SEVERE ERROR: content script tab Connection doesnot exists. incorrect tabId #' + tabId +
				'. Connection is closed. Cleaning resource......');
			locallog(msg);
		}
	};

	/////////////////////////////////////////////////////////
	//            content-script actionBuilder
	/////////////////////////////////////////////////////////
	temp.csActions = {};
	temp.csActions.ngDetect = function () {
		var messageData = self.message.data;
		tabs[self.tabId]['ngDetect'] = messageData;
		// angular page >> add , not angular page >> remove
		var taskForpanel = messageData.ngDetected ? 'addPanel' : 'removePanel';
		informPanel(self.tabId, messageData, taskForpanel);
		this.status = 'ngDetect-' + taskForpanel;
	};

	var csBuilder = birbalJS.actionBuilder.build(temp.csActions);
	// deleting it as no longer needed.
	delete temp.csActions;

	/////////////////////////////////////////////////////////
	//            panel actionBuilder
	/////////////////////////////////////////////////////////
	temp.panelActions = {};
	temp.panelActions.init = function () {
		// run pending tasks
		var ngDetect = tabs[self.tabId]['ngDetect'];
		var task = ngDetect && ngDetect.ngDetected ? 'addPanel' : 'removePanel';
		informPanel(self.tabId, ngDetect, task);
		this.status = 'initialized-' + task;
	};

	var panelBuilder = birbalJS.actionBuilder.build(temp.panelActions);
	// deleting it as no longer needed.
	delete temp.panelActions;
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	// Fired when the extension is first installed, when the extension is updated to a new version, and when Chrome is updated to a new version.
	chrome.runtime.onInstalled.addListener(function onInstalledCallback(details) {
		locallog('on' + details.reason + 'Callback: ');
		locallog(details);
		// on update or reload, cleanup and restart.
	});


	/////////////////////////////////////////////////////////
	//            On port connection
	/////////////////////////////////////////////////////////
	// Fired when a connection is made from either an extension process or a content script.
	// on reload of page, reopen of page, new connection, etc.
	chrome.runtime.onConnect.addListener(function onConnectCallback(connectingPort) {
		locallog('onConnectCallback, connectingPort-' + connectingPort.name);
		var connectionName = connectingPort.name;

		function panelMsgListener(message, sender, sendResponse) {
			locallog('panelMsgListener');
			var builder = new panelBuilder(message, connectingPort, birbalJS.END_POINTS.BACKGROUND, sender, sendResponse);
			// adding port if not exists
			tabs.addPort(builder.tabId, connectingPort, connectionName);
			builder.destPort = tabs.getPort(builder.tabId, message.dest);
			builder.takeAction();
			locallog('panel #' + builder.tabId + ' msg action status? ' + builder.status);
		}

		function contentScriptMsgListener(message, sender, sendResponse) {
			locallog('contentScriptMsgListener');
			var builder = new csBuilder(message, connectingPort, birbalJS.END_POINTS.BACKGROUND, sender, sendResponse);
			// adding port if not exists
			tabs.addPort(builder.tabId, connectingPort, connectionName);
			builder.destPort = tabs.getPort(builder.tabId, message.dest);
			builder.takeAction();
			locallog('content-script #' + builder.tabId + ' msg action status? ' + builder.status);
		}

		var msgListener;
		if (connectionName === birbalJS.END_POINTS.PANEL) {
			msgListener = panelMsgListener;
			// deleting others to avoid memory leaks
			// delete onportconn.contentScriptMsgListener;
		} else if (connectionName === birbalJS.END_POINTS.CONTENTSCRIPT) {
			msgListener = contentScriptMsgListener;
			// deleting others to avoid memory leaks
			// delete onportconn.panelMsgListener;
		}

		function onDisconnectCallback(disconnectingPort) {
			locallog('onDisconnectCallback');
			var tabId = tabs.removePort(disconnectingPort);
			// notify other connections to same tab
			// cleanup for disconnectingPort
			disconnectingPort.onMessage.removeListener(msgListener);
			locallog(tabs.length + 'After DisconnectCallback, removed tab #' + tabId + ': ' + connectionName);
		};

		// Bind connection,  message, events
		connectingPort.onMessage.addListener(msgListener);
		connectingPort.onDisconnect.addListener(onDisconnectCallback);
	});
	///////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////

})(chrome, birbalJS);
