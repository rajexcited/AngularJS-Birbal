(function (chrome, birbalJS, window) {
	'use strict';


	/////////////////////////////////////////////////////////
	//            LOGGER FOR DEVELOPMENT ONLY
	/////////////////////////////////////////////////////////
	// define 'noop' by default
	var locallog, proxylog;
	locallog = proxylog = function () {};
	if (birbalJS.debugMode) {
		// assign console.log or proxy logs
		locallog = function (any) {
			console.log(any);
		};
		// use proxy log
		proxylog = function (logMsg) {
			// get proxy logger when available
			proxylog = birbalJS.proxylog || proxylog;
			proxylog(logMsg);
		}
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	locallog('devtoolsPage.js is loading.');
	/////////////////////////////////////////////////////////
	//            Background connection setup
	/////////////////////////////////////////////////////////
	// Create a connection to the background page
	var backgroundConnection = chrome.runtime.connect({
		name: birbalJS.END_POINTS.DEVTOOLS
	});

	locallog('prepare for init message to BG');
	var backgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.DEVTOOLS);
	var informBackground = function (info, task) {
		var msg = new backgroundMessage(info);
		msg.task = task || msg.task;
		backgroundConnection.postMessage(msg);
	};

	/////////////////////////////////////////////////////////
	//            devtools actionBuilder
	/////////////////////////////////////////////////////////
	var temp = {};
	temp.dtActions = {};
	temp.dtActions.addPanel = function () {
		// initialize panel with graphs and information
		proxylog('panel added');
		locallog(this.message);
		this.status = 'panelAdded';
	};

	temp.dtActions.removePanel = function () {
		// initialize panel with information and links to this project
		proxylog('panel removed');
		locallog(this.message);
		this.status = 'panelRemoved';
	}

	var dtBuilder = birbalJS.actionBuilder.build(temp.dtActions);
	// deleting it as no longer needed.
	delete temp.dtActions;

	locallog('prepare for message listener ');
	/////////////////////////////////////////////////////////
	//            BG message listener
	/////////////////////////////////////////////////////////
	backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
		// in background message listener
		locallog('bgMsgListener');
		var actionBuilder =
			new dtBuilder(message, backgroundConnection, birbalJS.END_POINTS.DEVTOOLS, sender, sendResponse);
		builder.takeAction();
		locallog('background connection, msg action status? ' + builder.status);
	});
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////
	//            Create Panel
	/////////////////////////////////////////////////////////
	// default first message on inspect tab load, letting app know I'm ready
	// send after listener setup
	informBackground(null, 'init');

	///////////
	chrome.devtools.panels.create(
		'Angular Birbal',
		null, // No icon path
		'src/devtools/panel/index.html',
		null // no callback needed
	);
	///////////

	// proxy log to background
	birbalJS.proxylog = function (anymessage) {
		informBackground({
			task: 'log',
			log: anymessage
		});
	};

})(chrome, birbalJS, window);
