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

	/////////////////////////////////////////////////////////
	//            listener and communication
	/////////////////////////////////////////////////////////
	function message(msgDetails) {
		self = this;
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
		var index = 0,
			THRESHOLD = 5;
		scopePrototype.$digest = function $digest() {
			performance.mark('digestStart' + index);
			_backUp.digest.apply(this, arguments);
			performance.mark('digestEnd' + index);
			performance.measure('digest' + index, 'digestStart' + index, 'digestEnd' + index);
			// locallog('diegst time: ');
			locallog(performance.getEntriesByName('digest' + index));
			index++;
			if (index === THRESHOLD) {
				index = index % THRESHOLD;
				broadcastMessage(performance.getEntriesByType('measure'), 'digestMeasures');
				performance.clearMarks();
				performance.clearMeasures();
			}
		};
	}

	instrumentDigest();
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

})(window, document);
