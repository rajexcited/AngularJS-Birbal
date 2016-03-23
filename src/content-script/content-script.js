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
        logger = {};
        ['log', 'warn', 'info', 'error', 'debug'].forEach(function (prop) {
            logger[prop] = noop;
        });
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
    //backgroundConnection.onMessage.addListener(function bgMsgListener(message) {
    //    // in background message listener
    //    var newMessage = new birbalJS.Message(message.msgDetails, birbalJS.END_POINTS.CONTENTSCRIPT, birbalJS.END_POINTS.ANGULARINSPECTOR, message.task);
    //    logger.info(performance.now() + ' cs-' + newMessage.task);
    //    window.postMessage(newMessage, '*');
    //});

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
        var winmessage = event.data;
        logger.log(winmessage);
        if (winmessage.task === 'ngDetect' || winmessage.task === 'csInit') {
            // this is coming from angularDetect injector
            if (winmessage.msgDetails && winmessage.msgDetails.ngDetected) {
                // send message to BG for connecting and inspecting app
                logger.log('birbal finds angular app in page');
            } else {
                // send message to BG to clean up resources and connections.
                logger.log('birbal doesnot find angular app. cleanup resources. Bye');
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
    // logger.log('injecting script');

    function injectScript() {
        var htmlRootNode, script,
            name = 'angularinspector', rrt;
        logger.log('injecting script: ' + name);

        htmlRootNode = document.getElementsByTagName('html')[0];
        htmlRootNode.setAttribute('birbal-debug', birbalJS.debugMode.toString());
        // inject script to the page
        if (htmlRootNode.querySelector('.birbal-' + name)) {
            logger.log('already exists');
            return;
        }

        rrt = new RegExp('this\\.tabId.+;');
        script = document.createElement('script');
        script.innerText = 'BirbalMessage=' + birbalJS.Message.toString().replace(rrt, '');
        htmlRootNode.appendChild(script);
        // qq: if remove works, no need of regex to replace above
        htmlRootNode.removeChild(script);

        script = document.createElement('script');
        script.className = 'birbal-' + name;
        script.src = chrome.extension.getURL('src/content-script/inject/' + name + '.js');
        htmlRootNode.appendChild(script);
    }

    // #4
    injectScript();
    backgroundConnection.onMessage.addListener(function bgMsgListener(message) {
        // in background message listener
        var newMessage = new birbalJS.Message(message.msgDetails, birbalJS.END_POINTS.CONTENTSCRIPT, birbalJS.END_POINTS.ANGULARINSPECTOR, message.task);
        if (newMessage.task === 'instrumentNg') {
            document.getElementsByTagName('html')[0].setAttribute('birbal-ng-start', newMessage.msgDetails);
        } else {
            window.postMessage(newMessage, '*');
        }
    });

    logger.log('cleaning old resources if any');
    window.addEventListener('beforeunload', function () {
        // cleanup - closures, event listeners
        window.removeEventListener('message', injectedMsgListener);
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////
}(chrome, birbalJS, window, document));
