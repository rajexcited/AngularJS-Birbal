(function (window, document) {
	'use script';

	/**
		Birbal detects angular page, and notify with basic informations
	*/
	/////////////////////////////////////////////////////////
	//            LOGGER FOR DEVELOPMENT ONLY
	/////////////////////////////////////////////////////////
	// get flag value set by birbal
	var isDebugMode = document.getElementsByTagName('html')[0].getAttribute('birbal-debug');
	var ngRootNode;
	var _backUp = {};
	// define 'noop' by default
	var locallog = function () {};
	if (isDebugMode) {
		locallog = function (any) {
			console.log(any);
		};
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	locallog('loading birbal inspector of AngularJS App.');

	/////////////////////////////////////////////////////////
	//            BIRBAL SETUP
	/////////////////////////////////////////////////////////
	// listener and communication
	function message(msgDetails, task) {
		var self = this;
		self.source = 'angularinspector';
		self.dest = 'content-script';
		self.name = 'window-message';
		self.app = 'ngBirbal'
			// add details to data
		self.data = msgDetails;
		if (msgDetails) {
			self.task = task || msgDetails.task;
			delete msgDetails.task;
		}
	};

	var broadcastMessage = function (info, task) {
		var msg = new message(info, task);
		if (msg.task) {
			window.postMessage(msg, '*');
		} else {
			locallog('Error: task in undefined.');
		}
	};

	function contentMsgListener(event) {
		// We only accept messages from ourselves
		// We only accept message for our app and destination specified as this file.
		if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== 'angularinspector') {
			return;
		}
		locallog('in contentMsgListener-angular birbal');
		locallog(event.data);

		contentActions.takeAction(event.data);
		locallog('msg action status? ' + contentActions.status());
	}
	window.addEventListener('message', contentMsgListener, false);

	// actions defined for given messge task
	var contentActions = function () {};
	contentActions.status = function (_status) {
		if (_status) {
			contentActions._status.concat(', ' + _status);
		}
		return contentActions._status;
	};

	contentActions.takeAction = function (message) {
		contentActions._status = 'ready';
		if (message.task) {
			contentActions._message = message;
			contentActions[message.task]();
		} else {
			contentActions.status('no task defined');
		}
	};

	contentActions.runAnalysis = function () {
		ngRootNode = ngRootNode || document.querySelector('.ng-scope');
		instrumentDigest();
	};

	contentActions.disableme = function () {
		contentActions.status('disabled');
		cleanup();
	};

	contentActions.disconnect = function () {
		window.removeEventListener('message', contentMsgListener);
		cleanup();
		contentActions.status('disconnected');
	};

	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////
	//            Angular Informations
	/////////////////////////////////////////////////////////
	function getAngularVersion() {
		return window.angular && window.angular.version;
	}

	var PREFIX_REGEXP = /^((?:x|data)[\:\-_])/i;
	var SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
	var MOZ_HACK_REGEXP = /^moz([A-Z])/;

	/**
	 * Converts all attributes format into proper angular name.
	 * @param name Name to normalize
	 */
	function normalizeAngularAttr(name) {
		return name.replace(PREFIX_REGEXP, '')
			.replace(SPECIAL_CHARS_REGEXP, function (_, separator, letter, offset) {
				return offset ? letter.toUpperCase() : letter;
			})
			.replace(MOZ_HACK_REGEXP, 'Moz$1');
	}

	function getAngularApp() {
		locallog('finding app name');
		ngRootNode = ngRootNode || document.querySelector('.ng-scope');
		var attributes = ngRootNode.attributes,
			appname = ngRootNode.getAttribute('birbal-detected-app'),
			attrName,
			len = attributes.length,
			rr;

		if (appname) {
			return appname;
		}

		do {
			len--;
			attrName = attributes.item(len).name;
			if (normalizeAngularAttr(attrName) === 'ngApp') {
				appname = attributes.item(len).value;
				ngRootNode.setAttribute('birbal-detected-app', appname);
				break;
			}
		} while (len);

		if (!appname) {
			rr = RegExp('ng-app: (.*);');
			appname = rr.test(ngRootNode.className) ? rr.exec(ngRootNode.className)[1] : appname;
			ngRootNode.setAttribute('birbal-detected-app', appname);
		}

		return appname;
	}

	function removeMeFromDom() {
		var script = document.querySelector('SCRIPT.birbal-angularinspector');
		document.getElementsByTagName('html')[0].removeChild(script);
		locallog('removed myself from document....');
	}

	function cleanup() {
		if (_backUp.digest) {
			var scopePrototype = Object.getPrototypeOf(getRootScope());
			scopePrototype.$digest = _backUp.digest;
			delete _backUp.digest;
		}
		_backUp = undefined;
		ngRootNode = undefined;
	}
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
		locallog(_backUp.digest);
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
	/////////////////////////////////////////////////////////
	// 					START INSPECTING PAGE FOR ANGULAR
	/////////////////////////////////////////////////////////
	function startInspection() {
		locallog('starting inspection');
		// quick messaging
		var message = {
			task: 'ngDetect',
		};

		// get ANGULAR basic details
		message.ngVersion = getAngularVersion();
		message.ngDetected = !!message.ngVersion;
		if (message.ngDetected) {
			message.ngModule = getAngularApp();
		}
		// send inspection data
		broadcastMessage(message);
		locallog('message sent.')
			// removeMeFromDom();
		if (!message.ngDetected) {
			window.removeEventListener('message', contentMsgListener);
			cleanup();
		}
	}
	/////////

	if (document.readyState === 'complete') {
		locallog('doc ready');
		window.setTimeout(startInspection, 0);
	} else {
		function onwinload(e) {
			locallog('window onload');
			window.setTimeout(startInspection, 0);
		}

		window.addEventListener('load', onwinload, false);
	}

	window.addEventListener('beforeunload', function () {
		// cleanup
		window.removeEventListener('message', contentMsgListener);
		cleanup();
	});
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

})(window, document);
