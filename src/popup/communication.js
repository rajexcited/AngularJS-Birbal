/*global chrome, birbalJS*/
(function (chrome, birbalJS) {
    'use strict';

    /////////////////////////////////////////////////////////
    //            LOGGER FOR content-script
    /////////////////////////////////////////////////////////
    var logger;
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
    birbalJS.logger = logger;

    logger.log('initializing popup communication');
    var backgroundConnection = chrome.runtime.connect({
        name: birbalJS.END_POINTS.POPUP_HTTP
    });

    // get active tabId to communicate
    var tabId = new Promise((resolve) => (
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => (resolve(tabs[0].id)))
    ));

    /**
     * sends call message to background
     * @param info{object} must
     * @param task{string} optional
     * @param destination{string} use endPoints
     */
    function informBackground(info, task) {
        tabId.then(function (tid) {
            var message = {tabId: tid, msgDetails: info};
            message = new birbalJS.Message(message, birbalJS.END_POINTS.POPUP_HTTP, birbalJS.END_POINTS.BACKGROUND, task);
            backgroundConnection.postMessage(message);
            logger.log(message);
        });
    }

    informBackground(null, 'popupInit');

    /*******************************************************************************************
     * **********************************************            ********************************
     *  LOAD AND DISPLAY    ANY EXISTING HTTP MOCK FROM STORAGE
     *
     *  COMMUNICATE ABOUT ANY HTTP MOCK CHANGE
     *      -   TO STORE
     *      -   TO RESET HTTP MOCK WITH NEW CHANGES
     *
     * **********************************************            ********************************
     * ********************************************************************************************/

    logger.log('creating two way communication using async callback concept.');
    birbalJS.requestBackGround = function (info, task, waitEvent) {
        if (waitEvent) {
            // ref var instead of anonymous to add or remove after completing its purpose
            // clean up
            var ref = function (message) {
                if (message.task === waitEvent.name) {
                    backgroundConnection.onMessage.removeListener(ref);
                    waitEvent.listener(message.msgDetails);
                }
            };
            backgroundConnection.onMessage.addListener(ref);
        }
        informBackground(info, task);
    };

    birbalJS.toURL = function (url) {
        if (url && url instanceof Object) {
            url.toString = function () {
                return 'new RegExp("' + this.pattern + '", "' + this.flags + '")';
            };
        }
        return url;
    };

}(chrome, birbalJS));