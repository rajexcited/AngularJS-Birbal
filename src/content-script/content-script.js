/*global chrome, birbalJS, window, document*/
(function (chrome, birbalJS, window, document) {
    'use strict';
    // #1
    /**
     detects angular page, and take actions if required
     */
    var logger, backgroundConnection;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR content-script
    /////////////////////////////////////////////////////////
    // define 'noop' by default
    function noop() {
        return;
    }

    if (birbalJS.debugMode) {
        logger = window.console;
    } else {
        // mock logger with noop()
        logger = {
            'log': noop,
            'info': noop,
            'debug': noop,
            'table': noop,
            'warn': window.console.warn.bind(console),
            'error': window.console.error.bind(console)
        };
    }
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    logger.log('content-script is loading. getting ready.....setup Background connection');
    /////////////////////////////////////////////////////////
    //            Background connection setup
    /////////////////////////////////////////////////////////
    // #2 Create a connection to the background page
    backgroundConnection = chrome.runtime.connect({
        name: birbalJS.END_POINTS.CONTENTSCRIPT
    });

    /**
     * sends call message to background
     * @param info{object} must
     * @param task{string} optional
     * @param destination{string} use endPoints
     */
    function informBackground(info, task, destination) {
        var message = new birbalJS.Message(info, birbalJS.END_POINTS.CONTENTSCRIPT, destination, task);
        backgroundConnection.postMessage(message);
    }

    /////////////////////////////////////////////////////////
    //            BG message listener
    /////////////////////////////////////////////////////////
    backgroundConnection.onMessage.addListener(function bgMsgListener(message) {
        // in background message listener
        if (message.task === 'instrumentNg') {
            // qq: what's the purpose of this ???
            var htmlNode = document.getElementsByTagName('html')[0];
            htmlNode.setAttribute('birbal-ng-start', message.msgDetails.ngStart);
            htmlNode.setAttribute('birbal-ng-module', message.msgDetails.ngModule);
        } else {
            logger.table(message);
            window.postMessage(new birbalJS.Message(message.msgDetails, birbalJS.END_POINTS.CONTENTSCRIPT, birbalJS.END_POINTS.ANGULARINSPECTOR, message.task), '*');
        }
    });

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////
    //            Inject Script Communication setup
    /////////////////////////////////////////////////////////
    logger.log('setup for communication to all Injected files');

    // Listen for messages from the current page and send them to the background script for dispatch
    function injectedMsgListener(event) {
        // We only accept messages from ourselves
        // We only accept message for our app and destination specified as this file.
        /* jshint -W116 */
        /*jslint eqeq: true*/
        if (event.source != window || !event.data || event.data.app !== 'birbal' || event.data.receiverId !== 'content-script') {
            return;
        }
        /*jslint eqeq: false*/
        /* jshint +W116 */
        logger.log('in injectedMsgListener');
        var winmessage = event.data,
            bgtasks = new RegExp('^(ngDetect|csInit|dependencyTree|activeDependencies)$');
        logger.log(winmessage);
        if (bgtasks.test(winmessage.task)) {
            // this is coming from angularDetect injector
            if (winmessage.msgDetails && winmessage.msgDetails.ngDetected) {
                // send message to BG for connecting and inspecting app
                logger.log('birbal finds angular app in page');
            } else if (winmessage.task === 'ngDetect') {
                // send message to BG to clean up resources and connections.
                logger.log('birbal doesnot find angular app. cleanup resources. Bye');
                window.setTimeout(function () {
                    backgroundConnection.disconnect();
                    window.removeEventListener('message', injectedMsgListener);
                    backgroundConnection = undefined;
                    logger = undefined;
                }, 200);
            }
            informBackground(winmessage.msgDetails, winmessage.task, birbalJS.END_POINTS.BACKGROUND);
        } else {
            // all others are from angularinspector.js which communicates to panel
            informBackground(winmessage.msgDetails, winmessage.task, birbalJS.END_POINTS.PANEL);
        }
        ///////////////
    }

    // stateless
    window.addEventListener('message', injectedMsgListener, false);

    /////////////////////////////////////////////////////////
    //            Inject Script Communication setup
    /////////////////////////////////////////////////////////
    // after all listeners
    (function injectScript() {
        var htmlRootNode, script,
            name = 'angularinspector';
        logger.log('injecting script: ' + name);
        htmlRootNode = document.getElementsByTagName('html')[0];
        htmlRootNode.setAttribute('birbal-debug', birbalJS.debugMode.toString());
        // inject script to tab
        if (htmlRootNode.querySelector('.birbal-' + name)) {
            logger.log('already exists');
            return;
        }

        script = document.createElement('script');
        script.setAttribute('name', 'birbal-message');
        script.setAttribute('type', 'text/javascript');
        script.innerText = 'BirbalMessage=' + birbalJS.Message.toString();
        htmlRootNode.appendChild(script);

        script = document.createElement('script');
        script.className = 'birbal-' + name;
        script.setAttribute('type', 'text/javascript');
        script.innerText = '(' + window.inspectorExecutor.toString() + '(window, document))';
        htmlRootNode.appendChild(script);

        script = document.createElement('script');
        script.className = 'birbal-ngMock';
        script.setAttribute('type', 'text/javascript');
        script.src = chrome.extension.getURL('lib/angular-mocks.js');
        htmlRootNode.appendChild(script);
    }());

    // #4
    logger.log('cleaning old resources if any');
    window.addEventListener('beforeunload', function () {
        // cleanup - closures, event listeners
        window.removeEventListener('message', injectedMsgListener);
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////
}(chrome, birbalJS, window, document));
