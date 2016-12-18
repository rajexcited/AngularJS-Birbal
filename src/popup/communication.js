/*global chrome, birbalJS*/
(function (chrome, birbalJS) {
    'use strict';

    /////////////////////////////////////////////////////////
    //            LOGGER FOR content-script
    /////////////////////////////////////////////////////////
    var looger;
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
        tabId.then(function (tabid) {
            var message = new birbalJS.Message({
                tabId: tabid,
                info: info
            }, birbalJS.END_POINTS.POPUP_HTTP, birbalJS.END_POINTS.BACKGROUND, task);
            backgroundConnection.postMessage(message);
        });
    }

    informBackground(null, 'popup-init');

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

    logger.log('creating two way comminucation using async callback concept.');
    birbalJS.requestBackGround = function (info, task, callback) {
        if (callback) {
            // ref var instead of anonymous to add or remove after completing its purpose
            // clean up
            var ref = (message)=> {
                if (message.task === task.concat('-response')) {
                    backgroundConnection.onMessage.removeListener(ref);
                    callback(message.msgDetails);
                }
            };
            backgroundConnection.onMessage.addListener(ref);
        }
        informBackground(info, task);
    };

}(chrome, birbalJS));