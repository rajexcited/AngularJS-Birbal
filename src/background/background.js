(function (chrome, birbalJS) {
	'use strict';

	// all scripts gets reloaded after long inactive state

	/////////////////////////////////////////////////////////
	//            LOGGER FOR DEVELOPMENT ONLY
	/////////////////////////////////////////////////////////
	// define 'noop' by default
	var log = function () {};
	if (birbalJS.debugMode) {
		log = function (any) {
			console.log(any);
		};
		birbalJS.proxylog = log;
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	var temp = {};
	log('background.js loading');

	/////////////////////////////////////////////////////////
	//            TABS - CONNECTIONS and PROTOTYPE
	/////////////////////////////////////////////////////////
	var tabs = {};
	// prototype for basic functionality
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
	//            communication - content-script & devtools
	/////////////////////////////////////////////////////////////////////////////////////
	var devtoolsMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.BACKGROUND,
		birbalJS.END_POINTS.DEVTOOLS);
	var informDevtools = function (tabId, info, task) {
		var tab = tabs.getPort(tabId, birbalJS.END_POINTS.DEVTOOLS);
		var msg = new devtoolsMessage(info);
		msg.task = task || msg.task;
		if (tab) {
			tab.postMessage(msg);
		} else {
			log(
				'WARNING: devtools tab Connection doesnot exists. incorrect tabId or connection is closed. Retry later. message tried'
			);
			log(msg);
		}
	};

	var contentMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.BACKGROUND,
		birbalJS.END_POINTS.CONTENTSCRIPT);
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
			log(
				'SEVERE ERROR: content script tab Connection doesnot exists. incorrect tabId #' +
				tabId + '. Connection is closed. Cleaning resource.');
			log(msg);
		}
	};

	/////////////////////////////////////////////////////////
	//            content-script actionBuilder
	/////////////////////////////////////////////////////////
	temp.csActions = {};
	temp.csActions.ngDetect = function () {
		var messageData = this.message.data;
		tabs[this.tabId]['ngDetect'] = messageData;
		// angular page >> add , not angular page >> remove
		var taskForDevTools = messageData.ngDetected ? 'addPanel' : 'removePanel';
		informDevtools(tabId, messageData, taskForPanel);
		this.status = 'ngDetect/' + taskForDevTools;
	};

	var csBuilder = birbalJS.actionBuilder.build(temp.csActions);
	// deleting it as no longer needed.
	delete temp.csActions;

	/////////////////////////////////////////////////////////
	//            devtools actionBuilder
	/////////////////////////////////////////////////////////
	temp.dtActions = {};
	temp.dtActions.init = function () {
		// run pending tasks
		var ngDetect = tabs[this.tabId]['ngDetect'],
			task;
		if (ngDetect && ngDetect.ngDetected) {
			// angular detected in content
			task = 'addPanel';
			informDevtools(tabId, ngDetect, task);
		}
		this.status = 'initialized/' + task;
	};

	var dtBuilder = birbalJS.actionBuilder.build(temp.dtActions);
	// deleting it as no longer needed.
	delete temp.dtActions;
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	// Fired when the extension is first installed, when the extension is updated to a new version, and when Chrome is updated to a new version.
	chrome.runtime.onInstalled.addListener(function onInstalledCallback(details) {
		log('onInstalledCallback: ' + details.reason);
		// log(details);
		// on update or reload, cleanup and restart.
	});


	/////////////////////////////////////////////////////////
	//            On port connection
	/////////////////////////////////////////////////////////
	// Fired when a connection is made from either an extension process or a content script.
	// on reload of page, reopen of page, new connection, etc.
	chrome.runtime.onConnect.addListener(function onConnectCallback(
		connectingPort) {
		log('onConnectCallback, connectingPort-' + connectingPort.name);
		var connectionName = connectingPort.name;
		var devtoolsMsgListener = function (message, sender, sendResponse) {
			log('devtoolsMsgListener');
			var builder = new dtBuilder(message, connectingPort, birbalJS.END_POINTS
				.BACKGROUND, sender, sendResponse);
			// adding port if not exists
			tabs.addPort(builder.tabId, connectingPort, connectionName);
			builder.destPort = tabs.getPort(builder.tabId, message.destPort);
			builder.takeAction();
			log('devtools #' + builder.tabId + ' msg action status? ' + builder.status);
		};
		var contentScriptMsgListener = function (message, contentPort, sendResponse) {
			log('contentScriptMsgListener');
			var builder = new csBuilder(message, connectingPort, birbalJS.END_POINTS
				.BACKGROUND, sender, sendResponse);
			// adding port if not exists
			tabs.addPort(builder.tabId, connectingPort, connectionName);
			builder.destPort = tabs.getPort(builder.tabId, message.destPort);
			builder.takeAction();
			log('content-script #' + builder.tabId + ' msg action status? ' +
				builder.status);
		};
		var panelMsgListener = function (message, sender, sendResponse) {
			log('panelMsgListener');
			// log(message);
			// log(sender);
			// log(sendResponse);
		};

		var msgListener;
		if (connectionName === birbalJS.END_POINTS.DEVTOOLS) {
			msgListener = devtoolsMsgListener;
		} else if (connectionName === birbalJS.END_POINTS.CONTENTSCRIPT) {
			msgListener = contentScriptMsgListener;
		}

		var onDisconnectCallback = function (disconnectingPort) {
			log('onDisconnectCallback');
			var tabId = tabs.removePort(disconnectingPort);
			// notify other connections to same tab
			// cleanup for disconnectingPort
			disconnectingPort.onMessage.removeListener(msgListener);
			log('After DisconnectCallback, removed tab #' + tabId + ': ' +
				connectionName);
		};

		// Bind connection,  message, events
		connectingPort.onMessage.addListener(msgListener);
		connectingPort.onDisconnect.addListener(onDisconnectCallback);
	});
	///////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////

})(chrome, birbalJS);
