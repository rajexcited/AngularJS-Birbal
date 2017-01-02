/*global angular, chrome, birbalJS, window*/
(function (chrome, birbalJS, window, angular) {
    'use strict';

    var backgroundConnection;
    angular.module('background-service-app', ['measure.digest.app', 'measure.http.app', 'dependencyTree.app'])
        .service('backgroundService', ['$rootScope', 'digestDataFactory', 'httpRecordFactory', 'dependencyTree', function ($rootScope, digestDataFactory, httpRecordFactory, dependencyTree) {
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
                    'log': angular.noop,
                    'info': angular.noop,
                    'debug': angular.noop,
                    'table': angular.noop,
                    'warn': window.console.warn.bind(console),
                    'error': window.console.error.bind(console)
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
            receiver.actionOnTask('activeDependencies', function (message) {
                logger.log.bind(logger, 'activeDependencies:  ').call(logger, message.msgDetails);
                dependencyTree.addActive(message.msgDetails);
            });
            receiver.actionOnTask('dependencyTree', function (message) {
                logger.log.bind(logger, 'dependencyTree:  ').call(logger, message.msgDetails);
                dependencyTree.setTree(message.msgDetails);
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