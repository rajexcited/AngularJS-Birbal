(function (window, document) {
	'use script';

	/**
		detects angular page, and take actions if required
		this is driven by Birbal flag
		Birbal says start - start inspecting and profiling app
		Birbal says stop - stop all executions and disable the injection
	*/
	var isDebugMode = true;
	/////////////////////////////////////////////////////////
	//            LOGGER FOR DEVELOPMENT ONLY
	/////////////////////////////////////////////////////////
	// define 'noop' by default
	var locallog = function () {};
	if (isDebugMode) {
		// assign console.log or proxy logs
		locallog = function (any) {
			console.log(any);
		};
	}

	/////////////////////////////////////////////////////////
	//            Message setup
	/////////////////////////////////////////////////////////
	var messageImpl = function (msgDetails) {
		// add details to data
		this.data = msgDetails;
		if (msgDetails) {
			this.task = msgDetails.task;
			delete msgDetails.task;
		}
	};

	var getMessageBuilder = function (srcChannel, destEndPoint) {
		return function message(msgDetails) {
			this.source = srcChannel;
			this.dest = destEndPoint || 'content-script';
			// this.name = 'birbalMessage';
			this.name = 'window-message';
			this.app = 'ngBirbal'
			messageImpl.call(this, msgDetails);
		};
	};
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	var birbal = function () {};
	birbal.prototype.ngVersion = function () {
		return window.angular && window.angular.version;
	}
	log('injected.js loading\n\t- prepare for init message');

	/////////////////////////////////////////////////////////
	//            Communication
	/////////////////////////////////////////////////////////
	var contentMessage = getMessageBuilder('injected');
	var broadcastMessage = function (info, task) {
		var msg = new contentMessage(info);
		window.postMessage(msg);
	};

	log('Now listen for win message.');
	window.addEventListener('message', function contentMsgListener(event) {
		// We only accept messages from ourselves
		// We only accept message for our app and destination specified as this file.
		if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== 'injected') {
			return;
		}
		log('in contentMsgListener');
		log(event.data);
	}, false);
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////
	//            find Angular
	/////////////////////////////////////////////////////////
	if (document.readyState === 'complete') {
		window.setTimeout(initNgBirbal, 0);
	} else {
		window.addEventListener('load', function () {
			log('onload called');
			window.setTimeout(initNgBirbal, 0);
		}, false);
	}

	function initNgBirbal() {
		var info = {
			task: 'ngDetect',
			ngVersion: birbal.ngVersion()
		};

		info.ngDetected = !!info.ngVersion;
		//log(info);
		broadcastMessage(info);
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

})(window, document);
