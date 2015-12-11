/*global angular, chrome, birbalJS*/
(function (chrome, birbalJS, window, angular) {
    'use strict';

    angular.module('background-service-app', [])
        .service('backgroundService', ['$rootScope', function ($rootScope) {
            /////////////////////////////////////////////////////////
            //            LOGGER FOR DEVELOPMENT ONLY
            /////////////////////////////////////////////////////////
            // define 'noop' by default
            var logger,
                serviceInstance = this;

            if (birbalJS.debugMode) {
                logger = window.console;
            } else {
                // mock logger with noop()
                var noop = function () {
                };
                logger = {};
                ['log', 'warn', 'info', 'error', 'debug'].forEach(function (prop) {
                    logger[prop] = noop;
                });
            }
            // register logger service
            serviceInstance.logger = birbalJS.logger = logger;
            /////////////////////////////////////////////////////////
            //            Background connection setup
            /////////////////////////////////////////////////////////
            // Create a connection to the background page
            var backgroundConnection = chrome.runtime.connect({
                name: birbalJS.END_POINTS.PANEL
            });

            logger.log('message constructor to content script');
            var BackgroundMessage = birbalJS.messageBuilder(birbalJS.END_POINTS.PANEL, birbalJS.END_POINTS.CONTENTSCRIPT);
            serviceInstance.informBackground = function (info, task, newDest) {
                var msg = new BackgroundMessage(info);
                msg.task = task || msg.task;
                msg.dest = newDest || msg.dest;
                if (msg.task) {
                    backgroundConnection.postMessage(msg);
                } else {
                    birbalJS.proxylogger.error('task is not defined.');
                }
            };
            /////////////////////////////////////////////////////////
            //            panel actionBuilder
            /////////////////////////////////////////////////////////
            var panelActions = {};
            panelActions.addPanel = function () {
                // action list - cleanup and init
                $rootScope.$emit('panelAction', {action: 'clearResources'});
                $rootScope.$emit('panelAction', {
                    action: 'changePanelView',
                    args: {
                        page: 'initPage',
                        data: this.message.data
                    }
                });
                this.status('panelAdded');
            };

            panelActions.removePanel = function () {
                // two actions - cleanup and init
                $rootScope.$emit('panelAction', {action: 'clearResources'});
                $rootScope.$emit('panelAction', {
                    action: 'changePanelView',
                    args: {
                        page: 'initPage',
                        data: this.message.data
                    }
                });
                this.status('panelRemoved');
            };

            panelActions.digestMeasures = function () {
                $rootScope.$emit('panelAction', {
                    action: 'digestMeasure',
                    args: this.message.data
                });
                this.status('digestMeasure');
            };

            panelActions.httpMeasures = function () {
                $rootScope.$emit('panelAction', {
                    action: 'httpMeasure',
                    args: this.message.data
                });
                this.status('httpMeasure');
            };

            var PanelBuilder = birbalJS.actionBuilder.build(panelActions);
            // releasing resource as it has added to panelBuilder and panelActions not needed
            panelActions = undefined;
            /////////////////////////////////////////////////////////
            //            BG message listener
            /////////////////////////////////////////////////////////
            backgroundConnection.onMessage.addListener(function bgMsgListener(message, sender, sendResponse) {
                // in background message listener
                logger.log('in bgMsgListener');
                var actionBuilder = new PanelBuilder(message, backgroundConnection, birbalJS.END_POINTS.PANEL, sender, sendResponse);
                actionBuilder.takeAction();
                logger.log('background msg listener, msg action status? ' + actionBuilder.status());
            });

            // proxy log to background
            serviceInstance.proxylogger = birbalJS.proxylogger = {
                send: function (messageType, message) {
                    serviceInstance.informBackground({
                        'type': messageType,
                        'message': message
                    }, 'log', birbalJS.END_POINTS.BACKGROUND);
                }
            };

            ['log', 'warn', 'info', 'error', 'debug'].forEach(function (prop) {
                logger[prop] = noop;
            });
            /////////////////////////////////////////////////////////
            /////////////////////////////////////////////////////////
        }]);

}(chrome, birbalJS, window, angular));