/*global angular, chrome, birbalJS, window*/
(function (chrome, birbalJS, window, angular) {
    'use strict';

    var backgroundConnection;
    angular.module('background-service-app', ['measure.digest.app', 'measure.http.app'])
        .service('backgroundService', ['$rootScope', 'digestDataFactory', 'httpRecordFactory', function ($rootScope, digestDataFactory, httpRecordFactory) {
            /////////////////////////////////////////////////////////
            //            LOGGER FOR DEVELOPMENT ONLY
            /////////////////////////////////////////////////////////
            var receiver, logger,
                serviceInstance = this;

            if (birbalJS.debugMode) {
                logger = window.console;
            } else {
                // mock logger with noop()
                logger = {
                    'log': noop,
                    'info': noop,
                    'debug': noop,
                    'warn': function (msg) {
                        console.warn(msg);
                    },
                    'error': function (msg) {
                        console.error(msg);
                    }
                };
            }
            // register logger service
            serviceInstance.logger = birbalJS.logger = logger;

            // register send message
            logger.log('message constructor to content script');
            serviceInstance.informBackground = function (info, task, newDest) {
                newDest = newDest || birbalJS.END_POINTS.CONTENTSCRIPT;
                var msg = new birbalJS.Message(info, birbalJS.END_POINTS.PANEL, newDest, task);
                backgroundConnection.postMessage(msg);
            };
            /////////////////////////////////////////////////////////
            //            panel actionBuilder
            /////////////////////////////////////////////////////////
            receiver = new birbalJS.Receiver(birbalJS.END_POINTS.PANEL);

            function panelInitialize(message) {
                // action list - cleanup and init
                $rootScope.$emit('clearResources', message.task);
                $rootScope.$emit('changePanelView', 'nbEnable', message.msgDetails);
            }

            receiver.actionOnTask('addPanel', panelInitialize);
            receiver.actionOnTask('removePanel', panelInitialize);
            receiver.actionOnTask('ngDetectData', function (message) {
                $rootScope.$emit('ngAppDetails', message.msgDetails);
            });

            receiver.actionOnTask('digestMeasures', function (message) {
                digestDataFactory.addDigestMeasure(message.msgDetails);
            });

            receiver.actionOnTask('httpMeasures', function (message) {
                httpRecordFactory.addHttpMeasure(message.msgDetails);
            });
            /////////////////////////////////////////////////////////
            //            BG message listener
            /////////////////////////////////////////////////////////
            backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender) {
                // in background message listener
                logger.log('in bgMsgListener');
                receiver.answerCall(message, sender, backgroundConnection, birbalJS.END_POINTS.PANEL);
            });
            /////////////////////////////////////////////////////////
            /////////////////////////////////////////////////////////
        }])
        .run(function () {
            // Create a connection to the background page
            backgroundConnection = chrome.runtime.connect({
                name: birbalJS.END_POINTS.PANEL
            });
        });

}(chrome, birbalJS, window, angular));