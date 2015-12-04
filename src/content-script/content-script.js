/*global chrome, birbalJS*/
(function (chrome, birbalJS, window, document) {
    'use strict';

    /**
     detects angular page, and take actions if required
     */
    var logger;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR content-script
    /////////////////////////////////////////////////////////
    // define 'noop' by default
    function noop() {
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
    // Create a connection to the background page
    var backgroundConnection = chrome.runtime.connect({
        name: birbalJS.END_POINTS.CONTENTSCRIPT
    });

    var BackgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.CONTENTSCRIPT, birbalJS.END_POINTS.PANEL);
    var informBackground = function (info, task, newDest) {
        var msg = new BackgroundMessage(info);
        msg.task = task || msg.task;
        msg.dest = newDest || msg.dest;
        backgroundConnection.postMessage(msg);
    };

    /////////////////////////////////////////////////////////
    //            content-script actionBuilder
    /////////////////////////////////////////////////////////
    var temp = {};
    //temp.csActions = {};
    //temp.csActions.runAnalysis = function () {
    //    logger.log('in runAnalysis');
    //    var appname = this.message.data.ngModule;
    //    document.querySelector('.ng-scope').setAttribute('birbal-detected-app', appname);
    //    // injectScript('angularinspector');
    //    broadcastMessage(this.message.data, this.message.task);
    //    this.status('started analysis');
    //};

    var CsBuilder = birbalJS.actionBuilder;
    // deleting it as no longer needed.
    //delete temp.csActions;

    /////////////////////////////////////////////////////////
    //            BG message listener
    /////////////////////////////////////////////////////////
    backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
        // in background message listener
        // logger.log(message);
        //var isTaskDefined = message.task in CsBuilder.prototype;
        //logger.log('isTaskDefined? ' + isTaskDefined);
        //if (isTaskDefined) {
        //    logger.log('in bgMsgListener, task: ' + message.task);
        //    var actionBuilder =
        //        new CsBuilder(message, backgroundConnection, birbalJS.END_POINTS.CONTENTSCRIPT, sender, sendResponse);
        //    logger.log(actionBuilder);
        //    actionBuilder.takeAction();
        //    logger.log('background connection, msg action status? ' + actionBuilder.status());
        //} else {
        broadcastMessage(message.data, message.task);
        //logger.log('background connection, msg action status? broadcasted');
        //}
    });

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////
    //            Inject Script Communication setup
    /////////////////////////////////////////////////////////
    logger.log('setup for communication to all Injected files');
    var InjectedMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.CONTENTSCRIPT, 'angularinspector');
    var broadcastMessage = function (info, task) {
        var msg = new InjectedMessage(info);
        msg.task = task || msg.task;
        msg.app = 'ngBirbal';
        msg.name = "window-message";
        logger.log('broadcasting message');
        window.postMessage(msg, '*');
    };

    // Listen for messages from the current page and send then to the background script for dispatch
    function injectedMsgListener(event) {
        // We only accept messages from ourselves
        // We only accept message for our app and destination specified as this file.
        /* jshint -W116 */
        if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== birbalJS.END_POINTS
                .CONTENTSCRIPT) {
            return;
        }
        /* jshint +W116 */
        logger.log('in injectedMsgListener');
        var winmessage = event.data;
        logger.log(winmessage);
        if (winmessage.task === 'ngDetect') {
            // this is coming from angularDetect injector
            if (winmessage.data.ngDetected) {
                // send message to BG for connecting and inspecting app
                logger.log('birbal finds angular app in page');
            } else {
                // send message to BG to clean up resources and connections.
                logger.log('birbal doesnot find angular app. cleanup resources. Bye');
            }
            informBackground(winmessage.data, winmessage.task, birbalJS.END_POINTS.BACKGROUND);
        } else {
            // all others are from angularinspector.js which communicates to panel
            informBackground(winmessage.data, winmessage.task);
        }
        ///////////////
    }

    window.addEventListener('message', injectedMsgListener, false);

    /////////////////////////////////////////////////////////
    //            Inject Script Communication setup
    /////////////////////////////////////////////////////////
    // after all listeners
    // logger.log('injecting script');

    function injectScript(name) {
        logger.log('injecting script: ' + name);
        var htmlRootNode = document.getElementsByTagName('html')[0];
        htmlRootNode.setAttribute('birbal-debug', birbalJS.debugMode.toString());
        // inject script to the page
        if (htmlRootNode.querySelector('.birbal-' + name)) {
            logger.log('already exists');
            return;
        }
        var script = document.createElement('script');
        script.className = 'birbal-' + name;
        script.src = chrome.extension.getURL('src/content-script/inject/' + name + '.js');
        htmlRootNode.appendChild(script);
    }

    logger.log('cleaning old resources if any');
    injectScript('angularinspector');

    window.addEventListener('beforeunload', function () {
        // cleanup - closures, event listeners
        window.removeEventListener('message', injectedMsgListener);
        InjectedMessage = undefined;
        CsBuilder = undefined;
        BackgroundMessage = undefined;
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////
}(chrome, birbalJS, window, document));
