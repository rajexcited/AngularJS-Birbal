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
		self: tabs,
		getPort: function (tabId, portName) {
			return portName && self[tabId] && self[tabId][portName];
		},

		addPort: function (tabId, port, portName) {
			// add connection to tabs
			var tab = self[tabId] = (self[tabId] || {});
			tab[portName] = port;
		},

		removePort: function (port, portName) {
			var tabId = port.sender.tab && port.sender.tab.id;

			// delete connection
			if (tabId in self) {
				delete self[tabId][portName];
			} else {
				// tabId is not available
				// iterate through and delete
				var allTabIds = Object.keys(self),
					len = allTabIds.length,
					i;

				for (i = 0; i < len; i++) {
					tabId = allTabIds[i];
					if (self[tabId] === port) {
						delete self[tabId][portName];
						break;
					}
				}
			}
			if (!self[tabId][birbalJS.END_POINTS.PANEL] && !self[tabId][birbalJS.END_POINTS.CONTENTSCRIPT]) {
				// clean up tab resource
				self.removeTab(tabId);
			}
			// removed
			return tabId;
		},
		/////////////////////
		removeTab: function (tabId) {
			delete self[tabId];
			// notify others and cleanup connection
		}
	};

	Object.defineProperty(tabs.__proto__, 'length', {
		get: function () {
			return Object.keys(tabs).length;
		}
	});

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
		self.status('ngDetect-' + taskForpanel);
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
		self.status('initialized-' + task);
	};

	temp.panelActions.runAnalysis = function () {
		var ngDetect = tabs[self.tabId]['ngDetect'];
		ngDetect.ngModule = ngDetect.ngModule || self.message.data.ngModule;
		informContentScript(self.tabId, self.message.data, self.message.task);
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
			// locallog('panelMsgListener');
			var builder = new panelBuilder(message, connectingPort, birbalJS.END_POINTS.BACKGROUND, sender, sendResponse);
			// adding port if not exists
			tabs.addPort(builder.tabId, connectingPort, connectionName);
			builder.destPort = tabs.getPort(builder.tabId, message.dest);
			builder.takeAction();
			locallog('panel #' + builder.tabId + ' msg action status? ' + builder.status());
		}

		function contentScriptMsgListener(message, sender, sendResponse) {
			// locallog('contentScriptMsgListener');
			var builder = new csBuilder(message, connectingPort, birbalJS.END_POINTS.BACKGROUND, sender, sendResponse);
			// adding port if not exists
			tabs.addPort(builder.tabId, connectingPort, connectionName);
			builder.destPort = tabs.getPort(builder.tabId, message.dest);
			builder.takeAction();
			locallog('content-script #' + builder.tabId + ' msg action status? ' + builder.status());
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
			var tabId = tabs.removePort(disconnectingPort, connectionName);
			// notify other connections to same tab
			// cleanup for disconnectingPort
			disconnectingPort.onMessage.removeListener(msgListener);
			locallog(tabs.length + ' - After DisconnectCallback, removed tab #' + tabId + ': ' + connectionName);
		};

		// Bind connection,  message, events
		connectingPort.onMessage.addListener(msgListener);
		connectingPort.onDisconnect.addListener(onDisconnectCallback);
	});
	///////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////

})(chrome, birbalJS);
