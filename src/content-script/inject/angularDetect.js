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
	// define 'noop' by default
	var locallog = function () {};
	if (isDebugMode) {
		locallog = function (any) {
			if (typeof any === 'string') {
				any = 'angularDetect: ' + any;
			} else {
				console.log('angularDetect: ');
			}
			console.log(any);
		};
	}
	/////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////
	locallog('Birbal is inspecting page to find any sign of AngularJS');

	function removeMyself() {
		window.setTimeout(function () {
			var script = document.querySelector('SCRIPT.birbal-angularDetect');
			document.getElementsByTagName('html')[0].removeChild(script);
		}, 50);
		locallog('removed myself from document');
	}
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
		var ngRootNode = document.querySelector('.ng-scope'),
			attributes = ngRootNode.attributes,
			appname,
			attrName,
			len = attributes.length,
			rr;
		do {
			len--;
			attrName = attributes.item(len).name;
			if (normalizeAngularAttr(attrName) === 'ngApp') {
				appname = attributes.item(len).value;
				ngRootNode.setAttribute('data-birbal-detected-app', appname);
				break;
			}
		} while (len);

		if (!appname) {
			rr = RegExp('ng-app: (.*);');
			appname = rr.test(ngRootNode.className) ? rr.exec(ngRootNode.className)[1] : appname;
			ngRootNode.setAttribute('data-birbal-detected-app', appname);
		}

		return appname;
	}

	/////////////////////////////////////////////////////////
	// 					START INSPECTING PAGE FOR ANGULAR
	/////////////////////////////////////////////////////////
	function startInspection() {
		locallog('starting inspection');
		// quick messaging
		var message = {
			source: 'angularDetect-injection',
			dest: 'content-script',
			name: 'window-message',
			app: 'ngBirbal',
			task: 'ngDetect',
			data: {}
		};

		// get ANGULAR basic details
		message.data.ngVersion = getAngularVersion();
		message.data.ngDetected = !!message.data.ngVersion;
		if (message.data.ngDetected) {
			message.data.ngModule = getAngularApp();
		}
		// send inspection data
		window.postMessage(message, '*');
		locallog('message sent.')
		removeMyself();
	}
	/////////

	if (document.readyState === 'complete') {
		window.setTimeout(startInspection, 0);
	} else {
		window.addEventListener('load', function (e) {
			locallog('window onload');
			window.setTimeout(startInspection, 0);
		}, false);
	}

})(window, document);
