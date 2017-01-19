/*global chrome, birbalJS, window, document*/
(function (chrome, birbalJS, window, document) {
    'use strict';

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
    // Create a connection to the background page
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
        var birbalMsg = new birbalJS.Message(message.msgDetails, birbalJS.END_POINTS.CONTENTSCRIPT, birbalJS.END_POINTS.ANGULARINSPECTOR, message.task);
        window.postMessage(birbalMsg, '*');
        //logger.log(message);
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
        if (event.source != window || !event.data || event.data.app !== 'birbal' || event.data.receiverId !== birbalJS.END_POINTS.CONTENTSCRIPT) {
            return;
        }
        /*jslint eqeq: false*/
        /* jshint +W116 */
        var winMessage = event.data,
            destination;

        logger.log( 'in injectedMsgListener', winMessage);
        destination = (winMessage.task === 'csInit') ? birbalJS.END_POINTS.BACKGROUND : birbalJS.END_POINTS.PANEL;
        informBackground(winMessage.msgDetails, winMessage.task, destination);
        // this is coming from angularDetect injector
        if (winMessage.msgDetails && winMessage.msgDetails.ngDetected) {
            // send message to BG for connecting and inspecting app
            logger.log('birbal finds angular app in page');
        } else if (winMessage.task === 'ngDetect') {
            // send message to BG to clean up resources and connections.
            logger.log('birbal does not find angular app. cleanup resources. Bye');
            window.setTimeout(function () {
                backgroundConnection.disconnect();
                window.removeEventListener('message', injectedMsgListener);
                backgroundConnection = undefined;
                logger = undefined;
            }, 200);
        }
    }

    // stateless
    window.addEventListener('message', injectedMsgListener, false);

    /////////////////////////////////////////////////////////
    //            Inject Script Communication setup
    /////////////////////////////////////////////////////////
    // after registering all listeners
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
        script.innerText = 'birbalJS={Message:' + birbalJS.Message.toString() +
            ', Receiver:' + birbalJS.Receiver.toString() + '};';
        htmlRootNode.appendChild(script);

        script = document.createElement('script');
        script.className = 'birbal-' + name;
        script.setAttribute('type', 'text/javascript');
        script.innerText = '(' + window.inspectorExecutor.toString() + '(window, document))';
        delete window.inspectorExecutor;
        htmlRootNode.appendChild(script);

        script = document.createElement('script');
        script.className = 'birbal-ngMock';
        script.setAttribute('type', 'text/javascript');
        script.src = chrome.extension.getURL('lib/angular-mocks.js');
        htmlRootNode.appendChild(script);
    }());

    logger.log('to clean old resources if any');
    window.addEventListener('beforeunload', function () {
        // cleanup - closures, event listeners
        window.removeEventListener('message', injectedMsgListener);
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////
}(chrome, birbalJS, window, document));
