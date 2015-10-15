(function (chrome, birbalJS, window, document) {
	'use script';

	/**
		detects angular page, and take actions if required
	*/
	/////////////////////////////////////////////////////////
	//            LOGGER FOR content-script
	/////////////////////////////////////////////////////////
	// define 'noop' by default
	var log = proxylog = function () {};
	if (birbalJS.debugMode) {
		// assign console.log or proxy logs
		log = function (any) {
			console.log(any);
		};
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	log('content-script.js loading');

	/////////////////////////////////////////////////////////
	//            Background connection setup
	/////////////////////////////////////////////////////////
	// Create a connection to the background page
	var backgroundConnection = chrome.runtime.connect({
		name: birbalJS.END_POINTS.CONTENTSCRIPT
	});

	log('prepare for init message to BG');
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
		log('bgMsgListener');
		var actionBuilder =
			new csBuilder(message, backgroundConnection, birbalJS.END_POINTS.CONTENTSCRIPT, sender, sendResponse);
		builder.takeAction();
		log('background connection, msg action status? ' + builder.status);
	});
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////


	log('setup for communication to Injected js.');
	/////////////////////////////////////////////////////////
	//            Inject Script Communication setup
	/////////////////////////////////////////////////////////
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

		log('in injectedMsgListener');
		var winmessage = event.data;
		// log(winmessage);
		if (winmessage.task === 'ngDetect') {
			if (winmessage.data.ngDetected) {
				// send message to BG for connecting and inspecting app
				// innject birbal file
				log('birbal says you can start.');
			} else {
				// send message to BG to clean up resources and connections.
				log('birbal says stop, It is empty.');
			}
			informBackground(winmessage.data);
		}
		///////////////
	}, false);

	log('injecting script');
	// after all listeners
	// Add injected script to the page
	var script = document.createElement('script');
	// script.type = 'text/javascript';
	script.src = chrome.extension.getURL('inject/injected.js');
	var htmlRootNode = document.getElementsByTagName('html')[0];
	htmlRootNode.appendChild(script);
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

})(chrome, birbalJS, window, document);
