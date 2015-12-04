/*global angular*/
(function (window, document) {
    'use strict';

    /**
     Birbal detects angular page, and notify with basic informations
     */
    var logger, contentMessageActions;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR DEVELOPMENT ONLY
    /////////////////////////////////////////////////////////
    // get flag value set by birbal
    function noop() {
    }

    if (document.getElementsByTagName('html')[0].getAttribute('birbal-debug') === 'true') {
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

    logger.log('loading birbal inspector of AngularJS App.');
    /////////////////////////////////////////////////////////
    //            BIRBAL SETUP
    /////////////////////////////////////////////////////////
    // listener and communication
    var Message = function (msgDetails, task) {
        this.source = 'angularinspector';
        this.dest = 'content-script';
        this.name = 'window-message';
        this.app = 'ngBirbal';
        // add details to data
        this.data = msgDetails;
        this.task = task || msgDetails.task;
        if (msgDetails) {
            delete msgDetails.task;
        }
    };

    var broadcastMessage = function (info, task) {
        var msg = new Message(info, task);
        if (msg.task) {
            window.postMessage(msg, '*');
        } else {
            logger.error('Error: task in undefined.');
        }
    };

    function contentMsgListener(event) {
        // We only accept messages from ourselves
        // We only accept message for our app and destination specified as this file.
        /* jshint -W116 */
        if (event.source != window || !event.data || event.data.app !== 'ngBirbal' || event.data.dest !== 'angularinspector') {
            return;
        }
        /* jshint +W116 */
        logger.log('in contentMsgListener-angular birbal');
        logger.log(event.data);
        var messageActions = contentMessageActions(event.data);
        messageActions.takeAction();
        logger.log('msg action status? ' + messageActions.status());
    }

    window.addEventListener('message', contentMsgListener, false);
    // letting birbal app know that I'm ready
    broadcastMessage(null,'init');

    // actions defined for given message task
    contentMessageActions = function (contentMessage) {
        var actions = {},
            status = ['ready'];
        /**
         * disable plugin
         */
        actions.pauseAnalysis = function () {
            contentMessageActions.pause = true;
            status.push('paused');
        };
        /**
         * disconnect page or devtools or user stopped
         */
        actions.stopAnalysis = function () {
            contentMessageActions.stop = true;
            window.removeEventListener('message', contentMsgListener);
            cleanup();
            status.push('analysisStopped');
        };
        /**
         * detect angular loaded and run analysis
         */
        actions.startAnalysis = function () {
            // inject to ngmodule to get onload data
            if (contentMessageActions.pause === undefined) {
                document.addEventListener('DOMContentLoaded', angularLoaded);
            } else {
                contentMessageActions.pause = false;
            }
            status.push('analysisStarted');
        };

        // start regular analysis
        function angularLoaded() {
            try {
                //logger.log(document.readyState + ',  angular loaded? ' + !!window.angular);
                angular.module('ng');
                cleanup();
                instrumentAngular();
            } catch (err) {
                setTimeout(angularLoaded, 50);
            }
        }

        function takeAction() {
            status.push('actionStart');
            actions[contentMessage.task]();
            status.push('actionEnd');
        }

        function _status() {
            return status.join(',');
        }

        return {
            takeAction: takeAction,
            status: _status
        };
    };

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////
    //            Angular Informations
    /////////////////////////////////////////////////////////
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
        logger.log('finding app name');
        var ngRootNode = document.querySelector('.ng-scope'),
            attributes = ngRootNode.attributes,
            appname = ngRootNode.getAttribute('birbal-detected-app'),
            attrName,
            len = attributes.length,
            rr;

        if (appname) {
            return appname;
        }

        do {
            len--;
            attrName = attributes.item(len).name;
            if (normalizeAngularAttr(attrName) === 'ngApp') {
                appname = attributes.item(len).value;
                ngRootNode.setAttribute('birbal-detected-app', appname);
                break;
            }
        } while (len);

        if (!appname) {
            // ??????  through classname ??? is it supported?
            rr = new RegExp('ng-app: (.*);');
            appname = rr.test(ngRootNode.className) ? rr.exec(ngRootNode.className)[1] : appname;
            ngRootNode.setAttribute('birbal-detected-app', appname);
        }

        return appname;
    }

    function cleanup() {
        // clean all resources
    }

    /////////////////////////////////////////////////////////////////
    //            Instrumentation - Digest, watch, dependencies
    /////////////////////////////////////////////////////////////////
    function instrumentAngular() {
        // finder for early versions of angular which doesn't have definition
        annotateFinder();
        angular.module('ng')
            .config(function ($provide, $httpProvider) {

                function fnreplacer(key, value) {
                    if (typeof value === "function") {
                        return 'fn: ' + (value.name || value.toString());
                    }
                    return value;
                }

                function toStringForm(arg) {
                    return JSON.stringify(arg, fnreplacer);
                }

                // initialize nb to send measures
                var nb = {
                    digest: {
                        scope: {},
                        asyncQueue: [],
                        postDigestQueue: ''
                    },
                    destroy: [],
                    events: {
                        emit: [],
                        broadcast: []
                    },
                    http: {}
                };
                // instrument scope/rootScope
                $provide.decorator('$rootScope', function ($delegate) {
                    var scopePrototype,
                        _watch, _destroy, _digest, _apply, _emit, _broadcast;

                    /* $rootScope prototype initial reference version 1.2.4
                     https://github.com/angular/angular.js/blob/v1.2.4/src/ng/rootScope.js
                     supports: v1.2.4
                     */
                    scopePrototype = Object.getPrototypeOf($delegate);
                    _watch = scopePrototype.$watch;
                    scopePrototype.$watch = function (watchExp) {
                        var start,
                            _get, _fn,
                            _getret,
                            watcher, _eq,
                            watchret, wlen, watchstr,
                            scope = this;
                        // get watch setup
                        watchret = _watch.apply(scope, arguments);
                        // last is current
                        wlen = scope.$$watchers.length - 1;
                        watcher = scope.$$watchers[0];
                        watchstr = toStringForm(watchExp);
                        // patch get and fn to trace
                        _get = watcher.get;
                        _fn = watcher.fn;
                        _eq = !!watcher.eq;
                        watcher.get = function () {
                            var _watchers;
                            if (nb.pause) {
                                return _get.apply(null, arguments);
                            } else if (nb.stop) {
                                watcher.get = _get;
                                return watcher.get.apply(null, arguments);
                            }
                            _watchers = (_watchers = (nb.digest.scope[scope.$id] = nb.digest.scope[scope.$id] || {
                                        watchers: []
                                    }).watchers) && (_watchers[wlen] = _watchers[wlen] || []);
                            start = window.performance.now();
                            _getret = _get.apply(null, arguments);
                            _watchers.push({
                                get: (window.performance.now() - start),
                                eq: _eq
                            });
                            return _getret;
                        };

                        watcher.fn = function () {
                            var _watcher;
                            if (nb.pause) {
                                _fn.apply(null, arguments);
                            } else if (nb.stop) {
                                watcher.fn = _fn;
                                watcher.fn.apply(null, arguments);
                            }
                            _watcher = (_watcher = nb.digest.scope[scope.$id].watchers[wlen]) && _watcher[_watcher.length - 1];
                            _watcher.exp = watchstr;
                            start = window.performance.now();
                            _fn.apply(null, arguments);
                            _watcher.fn = window.performance.now() - start;
                        };

                        // cleaning as not needed in future
                        watcher = start = _getret = undefined;
                        // returning removal with cleanup
                        return function () {
                            watchret.apply(null, arguments);
                            watchret = wlen = watchstr = _get = _fn = scope = undefined;
                        };
                    };
                    _destroy = scopePrototype.$destroy;
                    scopePrototype.$destroy = function () {
                        if (!nb.pause || !nb.stop || !this.$$destroyed) {
                            nb.destroy = nb.destroy || [];
                            nb.destroy.push({
                                id: this.$id,
                                time: window.performance.now()
                            });
                        }
                        _destroy.apply(this, arguments);
                        _watch = _destroy = _digest = _apply = _emit = _broadcast = null;
                    };
                    _digest = scopePrototype.$digest;
                    scopePrototype.$digest = function () {
                        nb.pause = contentMessageActions.pause;
                        nb.stop = contentMessageActions.stop;
                        if (nb.pause) {
                            // for fail safe
                            nb.digest = {
                                scope: {}
                            };
                            _digest.apply(this, arguments);
                            return;
                        } else if (nb.stop) {
                            _digest.apply(this, arguments);
                            scopePrototype.$digest = _digest;
                            return;
                        }
                        try {
                            nb.digest = {
                                scope: {},
                                asyncQueue: [],
                                postDigestQueue: toStringForm(this.$$postDigestQueue)
                            };
                            this.$$asyncQueue.forEach(function (asyncTask) {
                                nb.digest.asyncQueue.push({
                                    scope: asyncTask.scope.$id,
                                    expression: toStringForm(asyncTask.expression)
                                });
                            });
                            nb.digest.startTime = window.performance.now();
                            _digest.apply(this, arguments);
                        } catch (e) {
                            nb.digest.error = {
                                message: e.message,
                                logs: e.stack
                            };
                            throw (e);
                        } finally {
                            if (!contentMessageActions.pause || !contentMessageActions.stop) {
                                nb.digest.endTime = window.performance.now();
                                nb.digest.destroy = nb.destory;
                                nb.digest.prevApplyEnd = nb.prevApplyEnd;
                                nb.digest.events=nb.events;
                                broadcastMessage(nb.digest, 'digestMeasures');
                                nb.prevApplyEnd = null;
                                nb.destroy.length = 0;
                                nb.events.emit.length = 0;
                                nb.events.broadcast.length = 0;
                            }
                        }
                    };
                    _apply = scopePrototype.$apply;
                    scopePrototype.$apply = function () {
                        _apply.apply(this, arguments);
                        nb.prevApplyEnd = window.performance.now();
                    };
                    _emit = scopePrototype.$emit;
                    scopePrototype.$emit = function () {
                        if (nb.pause) {
                            return _emit.apply(this, arguments);
                        } else if (nb.stop) {
                            scopePrototype.$emit = _emit;
                            return scopePrototype.$emit.apply(this, arguments);
                        }
                        var event = {
                            start: window.performance.now()
                        };
                        var emitret = _emit.apply(this, arguments);
                        event.end = window.performance.now();
                        event.duration = event.end - event.start;
                        nb.events.emit.push(event);
                        return emitret;
                    };
                    _broadcast = scopePrototype.$broadcast;
                    scopePrototype.$broadcast = function () {
                        if (nb.pause) {
                            return _broadcast.apply(this, arguments);
                        } else if (nb.stop) {
                            scopePrototype.$broadcast = _broadcast;
                            return scopePrototype.$broadcast.apply(this, arguments);
                        }
                        var event = {
                            start: window.performance.now()
                        };
                        var broadcastret = _broadcast.apply(this, arguments);
                        event.end = window.performance.now();
                        event.duration = event.end - event.start;
                        nb.events.broadcast.push(event);
                        return broadcastret;
                    };

                    return $delegate;
                });

                // register the interceptor as a service
                $httpProvider.interceptors.push(function () {
                    var cc = {};

                    function ccClean() {
                        angular.forEach(cc, function (value, key) {
                            delete cc[key];
                        });
                    }

                    return {
                        // optional method
                        'request': function (config) {
                            // do something on success
                            if (!nb.pause || !nb.stop) {
                                cc[config.url] = cc[config.url] || [];
                                cc[config.url].push({
                                    request: window.performance.now(),
                                    url: config.url,
                                    headers: config.headers,
                                    method: config.method
                                });
                            } else {
                                ccClean();
                            }
                            return config;
                        },

                        // optional method
                        'requestError': function (rejection) {
                            // do something on error
                            if (!nb.pause || !nb.stop) {
                                cc[rejection.config.url].forEach(function (httpCall) {
                                    if (httpCall.method === rejection.config.method && httpCall.headers === rejection.config.headers) {
                                        httpCall.requestError = window.performance.now();
                                    }
                                });
                            }
                            return rejection;
                        },


                        // optional method
                        'response': function (response) {
                            // do something on success
                            if (!nb.pause || !nb.stop) {
                                cc[response.config.url].forEach(function (httpCall, ind, list) {
                                    if (httpCall.method === response.config.method && httpCall.headers === response.config.headers) {
                                        httpCall.response = window.performance.now();
                                        broadcastMessage(httpCall, 'httpMeasures');
                                        list.splice(ind, 1);
                                    }
                                });
                            } else {
                                ccClean();
                            }
                            return response;
                        },

                        // optional method
                        'responseError': function (rejection) {
                            // do something on error
                            if (!nb.pause || !nb.stop) {
                                cc[rejection.config.url].forEach(function (httpCall, ind, list) {
                                    if (httpCall.method === rejection.config.method && httpCall.headers === rejection.config.headers) {
                                        httpCall.reponseError = window.performance.now();
                                        broadcastMessage(httpCall, 'httpMeasures');
                                        list.splice(ind, 1);
                                    }
                                });
                            } else {
                                ccClean();
                            }
                            return rejection;
                        }
                    };
                });

            });
    }

    ////////////////////////////////////////////////////////////////////
    // 			START INSPECTING PAGE FOR ANGULAR - onload, beforeunload
    /////////////////////////////////////////////////////////////////////
    var annotate;

    function annotateFinder() {

        annotate = annotate || window.angular.injector().annotate;
        if (annotate) {
            // defined
            return;
        }

        // annotate not exists - define same as angular
        // https://github.com/angular/angular.js/blob/v1.2.4/src/auto/injector.js
        var ARROW_ARG = /^([^\(]+?)=>/;
        var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m;
        var FN_ARG_SPLIT = /,/;
        var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

        function assertArg(arg, name, reason) {
            if (!arg) {
                throw Error('areq Argument "{0}" is {1} (' + name + ' || "?"), (' + reason + ' || "required")');
            }
            return arg;
        }

        function assertArgFn(arg, name, acceptArrayAnnotation) {
            if (acceptArrayAnnotation && window.angular.isArray(arg)) {
                arg = arg[arg.length - 1];
            }

            assertArg(window.angular.isFunction(arg), name, 'not a function, got ' +
                (arg && typeof arg === 'object' ? arg.constructor.name || 'Object' : typeof arg));
            return arg;
        }

        function extractArgs(fn) {
            var fnText = fn.toString().replace(STRIP_COMMENTS, '');
            return fnText.match(ARROW_ARG) || fnText.match(FN_ARGS);
        }

        function anonFn(fn) {
            // For anonymous functions, showing at the very least the function signature can help in
            // debugging.
            var args = extractArgs(fn);
            if (args) {
                return 'function(' + (args[1] || '').replace(/[\s\r\n]+/, ' ') + ')';
            }
            return 'fn';
        }

        annotate = function (fn, strictDi, name) {
            var $inject,
                argDecl,
                last;

            if (typeof fn === 'function') {
                if (!($inject = fn.$inject)) {
                    $inject = [];
                    if (fn.length) {
                        if (strictDi) {
                            if (!window.angular.isString(name) || !name) {
                                name = fn.name || anonFn(fn);
                            }
                            throw new Error('strictdi {0} is not using explicit annotation and cannot be invoked in strict mode-' + name);
                        }
                        argDecl = extractArgs(fn);
                        window.angular.forEach(argDecl[1].split(FN_ARG_SPLIT), function (arg) {
                            arg.replace(FN_ARG, function (all, underscore, name) {
                                $inject.push(name);
                            });
                        });
                    }
                    fn.$inject = $inject;
                }
            } else if (window.angular.isArray(fn)) {
                last = fn.length - 1;
                assertArgFn(fn[last], 'fn');
                $inject = fn.slice(0, last);
            } else {
                assertArgFn(fn, 'fn', true);
            }
            return $inject;
        };

    }

    ////////////////////////////////////////////////////////////////////
    // 			START INSPECTING PAGE FOR ANGULAR - onload
    /////////////////////////////////////////////////////////////////////
    function startInspection() {
        logger.log('starting inspection');
        if (annotate) {
            // angular has been instrumented
            return;
        }
        // quick messaging
        var msg = {
            task: 'ngDetect'
        };

        // get ANGULAR basic details
        msg.ngVersion = window.angular && window.angular.version;
        msg.ngDetected = !!msg.ngVersion;
        msg.ngModule = msg.ngDetected && getAngularApp() || null;
        // send inspection data
        broadcastMessage(msg);
        if (!msg.ngDetected) {
            // disconnect plugin
            contentMessageActions({task: 'stopAnalysis'}).takeAction();
        }
        logger.log('ngDetect message or cleanup');
    }

    /////////
    function onwinload() {
        //logger.log('window onload');
        window.setTimeout(startInspection, 0);
    }

    if (document.readyState === 'complete') {
        //logger.log('doc ready');
        window.setTimeout(startInspection, 0);
    } else {
        window.addEventListener('load', onwinload, false);
    }

    window.addEventListener('beforeunload', function () {
        // disconnect plugin
        contentMessageActions.disconnect();
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

})(window, document);
