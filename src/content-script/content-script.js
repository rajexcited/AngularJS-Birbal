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

	var backgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.CONTENTSCRIPT, birbalJS.END_POINTS.PANEL);
	var informBackground = function (info, task, newDest) {
		var msg = new backgroundMessage(info);
		msg.task = task || msg.task;
		msg.dest = newDest || msg.dest;
		backgroundConnection.postMessage(msg);
	};

	/////////////////////////////////////////////////////////
	//            content-script actionBuilder
	/////////////////////////////////////////////////////////
	var temp = {};
	temp.csActions = {};
	temp.csActions.runAnalysis = function () {
		locallog('in runAnalysis');
		var appname = this.message.data.ngModule;
		document.querySelector('.ng-scope').setAttribute('birbal-detected-app', appname);
		// injectScript('angularinspector');
		broadcastMessage(this.message.data, this.message.task);
		this.status('started analysis');
	};

	var csBuilder = birbalJS.actionBuilder.build(temp.csActions);
	// deleting it as no longer needed.
	delete temp.csActions;

	/////////////////////////////////////////////////////////
	//            BG message listener
	/////////////////////////////////////////////////////////
	backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
		// in background message listener
		// locallog(message);
		var isTaskDefined = message.task in csBuilder.prototype;
		locallog('isTaskDefined? ' + isTaskDefined);
		if (isTaskDefined) {
			locallog('in bgMsgListener, task: ' + message.task);
			var actionBuilder =
				new csBuilder(message, backgroundConnection, birbalJS.END_POINTS.CONTENTSCRIPT, sender, sendResponse);
			locallog(actionBuilder);
			actionBuilder.takeAction();
			locallog('background connection, msg action status? ' + actionBuilder.status());
		} else {
			broadcastMessage(message.data, message.task);
			locallog('background connection, msg action status? broadcasted');
		}
	});
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////
	//            Inject Script Communication setup
	/////////////////////////////////////////////////////////
	locallog('setup for communication to all Injected files');
	var injectedMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.CONTENTSCRIPT, 'angularinspector');
	var broadcastMessage = function (info, task) {
		var msg = new injectedMessage(info);
		msg.task = task || msg.task;
		msg.app = 'ngBirbal';
		msg.name = "window-message";
		locallog('broadcasting message');
		window.postMessage(msg, '*');
	};

	// Listen for messages from the current page and send then to the background script for dispatch
	function injectedMsgListener(event) {
		// We only accept messages from ourselves
		// We only accept message for our app and destination specified as this file.
		if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== birbalJS.END_POINTS
			.CONTENTSCRIPT) {
			return;
		}

		locallog('in injectedMsgListener');
		var winmessage = event.data;
		locallog(winmessage);
		if (winmessage.task === 'ngDetect') {
			// this is coming from angularDetect injector
			if (winmessage.data.ngDetected) {
				// send message to BG for connecting and inspecting app
				locallog('birbal finds angular app in page');
			} else {
				// send message to BG to clean up resources and connections.
				locallog('birbal doesnot find angular app. cleanup resources. Bye');
			}
			informBackground(winmessage.data, winmessage.task, birbalJS.END_POINTS.BACKGROUND);
			return;
		}

		// all others are from angularinspector.js which communicates to panel
		informBackground(winmessage.data, winmessage.task);
		///////////////
	}

	window.addEventListener('message', injectedMsgListener, false);

	/////////////////////////////////////////////////////////
	//            Inject Script Communication setup
	/////////////////////////////////////////////////////////
	// after all listeners
	// locallog('injecting script');

	function injectScript(name) {
		locallog('injecting script: ' + name);
		var htmlRootNode = document.getElementsByTagName('html')[0];
		htmlRootNode.setAttribute('birbal-debug', birbalJS.debugMode);
		// inject script to the page
		if (htmlRootNode.querySelector('.birbal-' + name)) {
			locallog('already exists');
		}
		var script = document.createElement('script');
		script.className = 'birbal-' + name;
		script.src = chrome.extension.getURL('src/content-script/inject/' + name + '.js');
		htmlRootNode.appendChild(script);
	}

	locallog('cleaning old resources if any');
	injectScript('angularinspector');

	window.addEventListener('beforeunload', function () {
		// cleanup - closures, event listeners
		window.removeEventListener('message', injectedMsgListener);
		injectedMessage = undefined;
		csBuilder = undefined;
		backgroundMessage = undefined;
	});
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
})(chrome, birbalJS, window, document);
