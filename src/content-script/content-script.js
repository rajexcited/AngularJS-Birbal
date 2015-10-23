(function (chrome, birbalJS, window, document) {
	'use script';

	/**
		detects angular page, and take actions if required
	*/
	/////////////////////////////////////////////////////////
	//            LOGGER FOR content-script
	/////////////////////////////////////////////////////////
	// define 'noop' by default
	var locallog = proxylog = function () {};
	if (birbalJS.debugMode) {
		// assign console.log or proxy logs
		locallog = function (any) {
			if (typeof any === 'string') {
				any = 'content-script: ' + any;
			} else {
				console.log('content-script: ');
			}
			console.log(any);
		};
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	locallog('content-script is loading. getting ready.....setup Background connection');

	/////////////////////////////////////////////////////////
	//            Background connection setup
	/////////////////////////////////////////////////////////
	// Create a connection to the background page
	var backgroundConnection = chrome.runtime.connect({
		name: birbalJS.END_POINTS.CONTENTSCRIPT
	});

	var backgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.CONTENTSCRIPT);
	var informBackground = function (info, task) {
		var msg = new backgroundMessage(info);
		msg.task = task || msg.task;
		backgroundConnection.postMessage(msg);
	};

	/////////////////////////////////////////////////////////
	//            content-script actionBuilder
	/////////////////////////////////////////////////////////
	var temp = {};
	temp.csActions = {};
	var csBuilder = birbalJS.actionBuilder.build(temp.csActions);
	// deleting it as no longer needed.
	delete temp.csActions;

	/////////////////////////////////////////////////////////
	//            BG message listener
	/////////////////////////////////////////////////////////
	backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
		// in background message listener
		var actionBuilder =
			new csBuilder(message, backgroundConnection, birbalJS.END_POINTS.CONTENTSCRIPT, sender, sendResponse);
		actionBuilder.takeAction();
		locallog('background connection, msg action status? ' + actionBuilder.status);
	});
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////
	//            Inject Script Communication setup
	/////////////////////////////////////////////////////////
	locallog('setup for communication to all Injected files');
	var injectedMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.CONTENTSCRIPT, 'injected');
	var broadcastMessage = function (info) {
		var msg = new injectedMessage(info);
		msg.app = 'ngBirbal';
		msg.name = "window-message";
		window.postMessage(msg);
	};

	// Listen for messages from the current page and send then to the background script for dispatch
	window.addEventListener('message', function injectedMsgListener(event) {
		// We only accept messages from ourselves
		// We only accept message for our app and destination specified as this file.
		if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== birbalJS.END_POINTS
			.CONTENTSCRIPT) {
			return;
		}

		locallog('in injectedMsgListener');
		var winmessage = event.data;
		if (winmessage.task === 'ngDetect') {
			// this is coming from angularDetect injector
			if (winmessage.data.ngDetected) {
				// send message to BG for connecting and inspecting app
				locallog('birbal finds angular app in page');
				injectScript('AngularStats');
			} else {
				// send message to BG to clean up resources and connections.
				locallog('birbal doesnot find angular app. cleanup resources. Bye');
			}
			informBackground(winmessage.data, winmessage.task);
		}
		///////////////
	}, false);

	/////////////////////////////////////////////////////////
	//            Inject Script Communication setup
	/////////////////////////////////////////////////////////
	// after all listeners
	locallog('injecting angularDetect script');

	function injectScript(name) {
		var htmlRootNode = document.getElementsByTagName('html')[0];
		htmlRootNode.setAttribute('data-birbal-debug', birbalJS.debugMode);
		// inject script to the page
		var script = document.createElement('script');
		script.id = 'birbal-' + name;
		script.src = chrome.extension.getURL('src/content-script/inject/' + name + '.js');
		htmlRootNode.appendChild(script);
	}

	injectScript('angularDetect');
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
})(chrome, birbalJS, window, document);
