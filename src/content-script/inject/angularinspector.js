(function (window, document) {
	'use script';

	/**
		Birbal detects angular page, and notify with basic informations
	*/
	/////////////////////////////////////////////////////////
	//            LOGGER FOR DEVELOPMENT ONLY
	/////////////////////////////////////////////////////////
	// get flag value set by birbal
	var isDebugMode = document.getElementsByTagName('html')[0].getAttribute('data-birbal-debug');
	var ngRootNode = angular.element(document.querySelector('.ng-scope'))[0];
	var _backUp = {};
	// define 'noop' by default
	var locallog = function () {};
	if (isDebugMode) {
		locallog = function (any) {
			if (typeof any === 'string') {
				any = 'angularinspector: ' + any;
			} else {
				console.log('angularinspector: ');
			}
			console.log(any);
		};
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	locallog('starting inspection of AngularJS App.');

	/////////////////////////////////////////////////////////
	//            Angular Informations
	/////////////////////////////////////////////////////////
	function getAngularVersion() {
		return window.angular && window.angular.version;
	}

	function getAngularApp() {
		locallog('finding app name');
		var appname = ngRootNode.data('birbalDetectedApp');

		return appname;
	}

	function removeMyself() {
		window.setTimeout(function () {
			var script = document.querySelector('SCRIPT.birbal-angularinspector');
			document.getElementsByTagName('html')[0].removeChild(script);
		}, 50);
		locallog('removed myself from document....clearing resources...');
		var scopePrototype = Object.getPrototypeOf(getRootScope());
		scopePrototype.$digest = _backUp.digest;
		_backUp = undefined;
		ngRootNode = undefined;
	}
	/////////////////////////////////////////////////////////
	//            listener and communication
	/////////////////////////////////////////////////////////
	function message(msgDetails) {
		var self = this;
		self.source = 'angularinspector';
		self.dest = 'content-script';
		self.name = 'window-message';
		self.app = 'ngBirbal'
			// add details to data
		self.data = msgDetails;
		if (msgDetails) {
			self.task = msgDetails.task;
			delete msgDetails.task;
		}
	};

	var broadcastMessage = function (info, task) {
		var msg = new message(info);
		msg.task = task || msg.task;
		window.postMessage(msg, '*');
	};

	window.addEventListener('message', function contentMsgListener(event) {
		// We only accept messages from ourselves
		// We only accept message for our app and destination specified as this file.
		if (event.source != window || !event.data || event.data.app !== 'ngBirbal' ||
			event.data.dest !== 'angularinspector') {
			return;
		}
		locallog('in contentMsgListener');
		locallog(event.data);
		var winmessage = event.data,
			info, task;
		if (winmessage.task === 'replyHi') {
			info = {
				greeting: 'Nice to talk to you finally.'
			};
			task = 'greeting';
		} else if (winmessage.task === 'removeme') {
			// do something
			removeMyself();
			return;
		}
		broadcastMessage(info, task);
	}, false);

	/////////////////////////////////////////////////////////
	//            Digest and watch
	/////////////////////////////////////////////////////////
	function getRootScope() {
		return angular.element(ngRootNode).scope().$root;
	}

	/**
	  Wraps the angular digest so that we can measure how long it take for the digest to happen.
	 */
	function instrumentDigest() {
		var scopePrototype = Object.getPrototypeOf(getRootScope());
		_backUp.digest = scopePrototype.$digest;
		var starttime, digesttime;
		scopePrototype.$digest = function $digest() {
			starttime = performance.now();
			_backUp.digest.apply(this, arguments);
			digesttime = performance.now() - starttime;
			// locallog('diegst time: ');
			// locallog(performance.getEntriesByName('digest' + index));
			broadcastMessage({
				startTime: starttime,
				duration: digesttime
			}, 'digestMeasures');
		};
	}

	instrumentDigest();
	// alert('angularinspector:test communication....say hi');
	// broadcastMessage({
	// 	greeting: 'Hello, How are you?'
	// }, 'greeting');
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

})(window, document);
