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
	var birbalImpl = function () {};
	birbalImpl.prototype.ngVersion = function () {
		return window.angular && window.angular.version;
	};

	birbalImpl.prototype.getMessageBuilder = function (srcChannel, destEndPoint) {
		return function message(msgDetails) {
			self = this;
			self.source = srcChannel;
			self.dest = destEndPoint || 'content-script';
			// this.name = 'birbalMessage';
			self.name = 'window-message';
			self.app = 'ngBirbal'
				// add details to data
			self.data = msgDetails;
			if (msgDetails) {
				self.task = msgDetails.task;
				delete msgDetails.task;
			}
		};
	};

	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	var birbalJS = new birbalImpl();
	locallog('injected.js loading\n\t- prepare for init message');

	/////////////////////////////////////////////////////////
	//            Communication
	/////////////////////////////////////////////////////////
	var contentMessage = birbalJS.getMessageBuilder('injected');
	var broadcastMessage = function (info, task) {
		var msg = new contentMessage(info);
		window.postMessage(msg, '*');
	};

	locallog('Now listen for win message.');
	window.addEventListener('message', function contentMsgListener(event) {
		// We only accept messages from ourselves
		// We only accept message for our app and destination specified as this file.
		if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== 'injected') {
			return;
		}
		locallog('in contentMsgListener');
		locallog(event.data);
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
			locallog('onload called');
			window.setTimeout(initNgBirbal, 0);
		}, false);
	}

	function initNgBirbal() {
		var info = {
			task: 'ngDetect',
			ngVersion: birbalJS.ngVersion(),
			ngModule: getNgApp()
		};

		info.ngDetected = !!info.ngVersion;
		//locallog(info);
		broadcastMessage(info);
	}

	function getNgApp() {
		var ngRootNode = birbalJS.angularRootNode = angular.element(document.querySelector('.ng-scope'));
		birbalJS._angularInjector = ngRootNode.injector();
		var appname, i,
			attributes = ngRootNode[0].attributes,
			len = attributes.length;
		for (i = 0; i < len; i++) {
			if (normalizeAngularAttr(attributes[i].name) === 'ngApp') {
				appname = attributes[i].value;
				break;
			}
		}
		return appname;
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
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////

})(window, document);
