/*global angular, BirbalMessage, window, document*/
(function (window, document) {
    'use strict';

    /**
     Birbal detects angular page, and notify with basic informations
     */
    var logger, contentMessageActions = {}, receiver, annotate;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR DEVELOPMENT ONLY
    /////////////////////////////////////////////////////////
    // get flag value set by birbal
    function noop() {
        return;
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
    function broadcastMessage(info, task) {
        var msg = new BirbalMessage(info, 'angular-inspector', 'content-script', task);
        window.postMessage(msg, '*');
    }

    function contentMsgListener(event) {
        // We only accept messages from ourselves
        // We only accept message for our app and destination specified as this file.
        /* jshint -W116 */
        /*jslint eqeq: true*/
        if (event.source != window || !event.data || event.data.app !== 'birbal' || event.data.receiverId !== 'angular-inspector') {
            return;
        }
        /*jslint eqeq: false*/
        /* jshint +W116 */
        logger.log('in contentMsgListener-angular birbal ' + performance.now());
        logger.log(event.data);
        receiver.answerCall(event.data);
    }

    window.addEventListener('message', contentMsgListener, false);

    // actions defined for given message task
    function ReceiverImpl() {
        var receiverSelf = this,
            taskCallBackList = {};

        receiverSelf.answerCall = function (contentMessage) {
            var taskName, callback;

            contentMessage.status = 'connecting';
            taskName = contentMessage.task;
            callback = taskCallBackList[taskName];
            if (!callback) {
                throw new Error('given task:"' + taskName + '" is not registered with action callback.');
            }
            callback.apply(null, arguments);
            contentMessage.status = 'answered';
        };

        receiverSelf.actionOnTask = function (task, actionCallBack) {
            if (typeof task !== 'string' && typeof actionCallBack !== 'function') {
                throw new Error('arguments(task, actionCallBack) are not matching');
            }
            taskCallBackList[task] = actionCallBack;
        };
    }

    receiver = new ReceiverImpl();

    // #9
    /**
     * detect angular loaded and run analysis
     */
    receiver.actionOnTask('startAnalysis', function () {
        // inject to ngmodule to get onload data
        if (contentMessageActions.pause !== undefined) {
            contentMessageActions.pause = false;
        }
    });

    /**
     * disable plugin
     */
        // qq: when do i need this?
    receiver.actionOnTask('pauseAnalysis', function () {
        contentMessageActions.pause = true;
    });

    /**
     * disconnect page or devtools or user stopped
     */
        // qq: when do i need this?
    receiver.actionOnTask('stopAnalysis', function () {
        contentMessageActions.stop = true;
        //window.location.reload();
    });

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////
    //            Angular Informations
    /////////////////////////////////////////////////////////
    /**
     * @returns ngApp name {string}
     */
    function getAngularApp() {
        logger.log('finding app name');
        var ngRootNode = document.querySelector('.ng-scope'),
            attributes = ngRootNode.attributes,
            appname,
            attrName,
            len = attributes.length;

        do {
            len--;
            attrName = attributes.item(len).name;
            if (normalizeAngularAttr(attrName) === 'ngApp') {
                appname = attributes.item(len).value;
                break;
            }
        } while (len);

        return appname;

        /**
         * Converts all attributes format into proper angular name.
         * @param name Name to normalize
         */
        function normalizeAngularAttr(name) {
            var PREFIX_REGEXP = /^((?:x|data)[\:\-_])/i,
                SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g,
                MOZ_HACK_REGEXP = /^moz([A-Z])/;

            return name.replace(PREFIX_REGEXP, '')
                .replace(SPECIAL_CHARS_REGEXP, function (_, separator, letter, offset) {
                    return offset ? letter.toUpperCase() : letter;
                })
                .replace(MOZ_HACK_REGEXP, 'Moz$1');
        }
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
                var nb,
                    perf = window.performance;
                nb = {
                    digest: {
                        scope: {},
                        asyncQueue: [],
                        postDigestQueue: ''
                    },
                    events: {
                        emit: [],
                        broadcast: []
                    },
                    http: {},
                    asyncEval: [],
                    browserDefer: []
                };

                // instrument scope/rootScope
                $provide.decorator('$rootScope', function ($delegate) {
                    var scopePrototype, ngWatch, ngWatchCollection, ngDigest, ngApply, ngEmit, ngBroadcast, ngEvalAsync,
                        watchCollectionExp;

                    /* $rootScope prototype initial reference version 1.2.4
                     https://github.com/angular/angular.js/blob/v1.2.4/src/ng/rootScope.js
                     supports: v1.2.4
                     */
                    scopePrototype = Object.getPrototypeOf($delegate);
                    // add watch collection here
                    ngWatch = scopePrototype.$watch;
                    scopePrototype.$watch = function (watchExp) {
                        var start, runtime,
                            ngWatchGet, ngWatchFn, ngWatchEq, ngWatchret,
                            addedWatcher, watchstr,
                            indRvs, wInd,
                            _watchers, _getret,
                            scope = this;
                        // watch setup
                        ngWatchret = ngWatch.apply(scope, arguments);
                        // last is current
                        indRvs = scope.$$watchers.length;
                        addedWatcher = scope.$$watchers[0];
                        watchstr = toStringForm(watchCollectionExp || watchExp.exp || watchExp);
                        // patch get and fn to trace
                        ngWatchGet = addedWatcher.get;
                        ngWatchFn = addedWatcher.fn;
                        ngWatchEq = !!addedWatcher.eq;

                        addedWatcher.get = function () {
                            if (nb.pause) {
                                //clear
                                return ngWatchGet.apply(null, arguments);
                            }
                            try {
                                wInd = scope.$$watchers.length - indRvs;
                                _watchers = nb.digest.scope[scope.$id].watchers[wInd] || [];
                            } catch (e) {
                                _watchers = nb.digest.scope[scope.$id] = nb.digest.scope[scope.$id] ||
                                    {
                                        watchers: [],
                                        parent: scope.$parent && scope.$parent.$id
                                    };
                                _watchers = _watchers.watchers[wInd] = _watchers.watchers[wInd] || [];
                            }
                            start = perf.now();
                            _getret = ngWatchGet.apply(null, arguments);
                            runtime = perf.now() - start;
                            if (_watchers.length === 0) {
                                _watchers.push({
                                    'get': runtime,
                                    'exp': watchstr,
                                    'eq': ngWatchEq
                                });
                            } else {
                                _watchers.push(runtime);
                            }
                            return _getret;
                        };

                        addedWatcher.fn = function () {
                            if (nb.pause) {
                                ngWatchFn.apply(null, arguments);
                            } else {
                                //try {
                                var len = _watchers.length, _w;
                                if (len === 1) {
                                    _w = _watchers[0];
                                } else {
                                    runtime = _watchers[len - 1];
                                    _w = _watchers[len - 1] = {'get': runtime};
                                }

                                _w.start = start = perf.now();
                                ngWatchFn.apply(null, arguments);
                                _w.fn = perf.now() - start;
                            }
                        };

                        // returning removal with cleanup
                        return function removeWatcher() {
                            // clear
                            addedWatcher.get = ngWatchGet;
                            addedWatcher.fn = ngWatchFn;
                            ngWatchret.apply(null, arguments);
                            ngWatchret = runtime = addedWatcher = start = _getret = _watchers = wInd = indRvs = watchstr = ngWatchEq = ngWatchFn = ngWatchGet = scope = undefined;
                        };
                    };
                    ngWatchCollection = scopePrototype.$watchCollection;
                    scopePrototype.$watchCollection = function (obj) {
                        // here, we want to use obj as watch expression for better debug and analysis purpose
                        var collectionRemoval;
                        watchCollectionExp = obj;
                        collectionRemoval = ngWatchCollection.apply(this, arguments);
                        watchCollectionExp = undefined;
                        return collectionRemoval;
                    };
                    ngDigest = scopePrototype.$digest;
                    scopePrototype.$digest = function () {
                        var scope = this;
                        nb.pause = contentMessageActions.pause;
                        if (nb.pause) {
                            ngDigest.apply(scope, arguments);
                            return;
                        }
                        try {
                            nb.digest = {
                                scope: {},
                                asyncQueue: '',
                                postDigestQueue: toStringForm(scope.$$postDigestQueue)
                            };
                            nb.digest.asyncQueue = scope.$$asyncQueue.map(function (a) {
                                var m = a;
                                if (typeof a === 'object') {
                                    m = {};
                                    m.expression = a.expression;
                                    m.scope = a.scope.$id;
                                }
                                return toStringForm(m);
                            });
                            nb.digest.startTime = perf.now();
                            ngDigest.apply(scope, arguments);
                        } catch (e) {
                            nb.digest.error = {
                                message: e.message,
                                logs: e.stack
                            };
                            throw e;
                        } finally {
                            nb.digest.endTime = perf.now();
                            nb.digest.applyStartTime = nb.applyStartTime;
                            nb.digest.applyEndTime = nb.applyEndTime;
                            nb.digest.events = nb.events;
                            nb.digest.async = {
                                evalAsync: nb.asyncEval,
                                browserDefer: nb.browserDefer
                            };
                            broadcastMessage(nb.digest, 'digestMeasures');
                            nb.applyStartTime = nb.applyEndTime = undefined;
                            nb.events.emit.length = 0;
                            nb.events.broadcast.length = 0;
                            nb.asyncEval.length = 0;
                            nb.browserDefer.length = 0;
                        }
                    };
                    ngApply = scopePrototype.$apply;
                    scopePrototype.$apply = function () {
                        nb.applyStartTime = perf.now();
                        ngApply.apply(this, arguments);
                        nb.applyEndTime = perf.now();
                    };
                    ngEmit = scopePrototype.$emit;
                    scopePrototype.$emit = function (name) {
                        if (nb.pause) {
                            return ngEmit.apply(this, arguments);
                        }
                        var emitret,
                            event = {
                                start: perf.now(),
                                name: name,
                                fromScope: this.$id
                            };
                        emitret = ngEmit.apply(this, arguments);
                        event.end = perf.now();
                        event.runtime = event.end - event.start;
                        nb.events.emit.push(event);
                        return emitret;
                    };
                    ngBroadcast = scopePrototype.$broadcast;
                    scopePrototype.$broadcast = function (name) {
                        var event, broadcastret;
                        if (nb.pause) {
                            return ngBroadcast.apply(this, arguments);
                        }
                        event = {
                            start: perf.now(),
                            name: name,
                            fromScope: this.$id
                        };
                        broadcastret = ngBroadcast.apply(this, arguments);
                        event.end = perf.now();
                        event.runtime = event.end - event.start;
                        nb.events.broadcast.push(event);
                        return broadcastret;
                    };
                    ngEvalAsync = scopePrototype.$evalAsync;
                    scopePrototype.$evalAsync = function () {
                        ngEvalAsync.apply(this, arguments);
                        nb.asyncEval.push(perf.now());
                    };

                    return $delegate;
                });

                //qq: how can i analyze http with my digest cycle
                // register the interceptor as a service
                $httpProvider.interceptors.push(function () {

                    function collectHttpData(config) {
                        var httpCall = {
                            url: config.url,
                            method: config.method,
                            req: config.nbTime.req,
                            reqErr: config.nbTime.reqErr,
                            resp: config.nbTime.resp,
                            respErr: config.nbTime.respErr
                        };
                        broadcastMessage(httpCall, 'httpMeasures');
                    }

                    return {
                        'request': function (config) {
                            if (!nb.pause) {
                                config.nbTime = {'req': perf.now()};
                            }
                            return config;
                        },
                        'requestError': function (rejection) {
                            if (rejection.nbTime) {
                                rejection.nbTime.reqErr = perf.now();
                                collectHttpData(rejection);
                            }
                            return rejection;
                        },
                        'response': function (response) {
                            // do something on success
                            if (response.nbTime) {
                                response.nbTime.resp = perf.now();
                                collectHttpData(response);
                            }
                            return response;
                        },
                        'responseError': function (rejection) {
                            // do something on error
                            if (rejection.nbTime) {
                                rejection.nbTime.respErr = perf.now();
                                collectHttpData(rejection);
                            }
                            return rejection;
                        }
                    };
                });

                // $browser to capture async task
                $provide.decorator('$browser', function ($delegate) {
                    var ngDefer = $delegate.defer;
                    var wrapper = function () {
                        ngDefer.apply(null, arguments);
                        nb.browserDefer.push(perf.now());
                    };
                    wrapper.prototype = ngDefer.prototype;
                    wrapper.cancel = ngDefer.cancel;
                    $delegate.defer = wrapper;
                    return $delegate;
                });
            });
    }

    ////////////////////////////////////////////////////////////////////
    //  START INSPECTING PAGE FOR ANGULAR - onload, beforeunload
    //  annotate is use for angular providers
    /////////////////////////////////////////////////////////////////////
    function annotateFinder() {
        annotate = angular.injector().annotate;
        if (annotate) {
            // defined
            return;
        }

        // annotate not exists - define same as angular
        // https://github.com/angular/angular.js/blob/v1.2.4/src/auto/injector.js
        var ARROW_ARG = /^([^\(]+?)=>/,
            FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m,
            FN_ARG_SPLIT = /,/,
            FN_ARG = /^\s*(_?)(\S+?)\1\s*$/,
            STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

        function assertArg(arg, name, reason) {
            if (!arg) {
                throw new Error('areq Argument "{0}" is {1} (' + name + ' || "?"), (' + reason + ' || "required")');
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
    //      START INSPECTING PAGE FOR ANGULAR - onload
    /////////////////////////////////////////////////////////////////////
    function generateXPath(element) {
        if (element.id === undefined) {
            return;
        }
        if (element.id !== '') {
            return 'id("' + element.id + '")';
        }
        if (element === document.body || element.parentNode === null) {
            return element.tagName;
        }

        var ix = 0;
        var siblings = element.parentNode.childNodes;

        for (var i = 0; i < siblings.length; i++) {
            var sibling = siblings[i];
            if (sibling === element) {
                var parentX = generateXPath(element.parentNode);
                if (!parentX) {
                    parentX = '';
                } else {
                    parentX = parentX + '/';
                }
                return parentX + element.tagName + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

    function inspectAngular() {
        logger.log('starting inspection ' + performance.now());
        //if (annotate) {
        //    // angular has been instrumented
        //    return;
        //}
        contentMessageActions.angularDetected = true;
        // quick messaging
        var msg = {};
        // get ANGULAR basic details
        msg.ngVersion = window.angular && window.angular.version;
        msg.ngDetected = !!msg.ngVersion;
        msg.ngModule = msg.ngDetected && getAngularApp() || '';
        msg.ngRootNode = msg.ngDetected && generateXPath(document.querySelector('.ng-scope'));
        // send inspection data
        broadcastMessage(msg, 'ngDetect');
        // qq: do i need this?
        //if (!msg.ngDetected) {
        // disconnect plugin
        //receiver.answerCall({task: 'stopAnalysis'});
        //}
        logger.log('ngDetect message or cleanup');
    }

    /////////
    if (document.readyState === 'complete') {
        window.setTimeout(inspectAngular, 1);
    } else {
        window.addEventListener('load', function onwinload() {
            window.setTimeout(inspectAngular, 1);
        }, false);
    }

    // #1 ,use for #9 & #10
    // letting birbal app know that I'm ready
    broadcastMessage(null, 'csInit');
    // start angular analysis
    function waitForAngularLoad(callback) {
        contentMessageActions.angularDetected = false;
        var isAngularLoaded = function () {
                if (window.angular && !contentMessageActions.angularDetected) {
                    try {
                        angular.module('ng');
                        contentMessageActions.angularDetected = true;
                        document.removeEventListener('DOMNodeInserted', areWeThereYet);
                        callback();
                        return true;
                    } catch (e) {
                        // not ready
                    }
                }
                return false;
            },
            areWeThereYet = function (event) {
                if (!isAngularLoaded() && event.srcElement.tagName === 'SCRIPT') {
                    event.srcElement.addEventListener('load', isAngularLoaded);
                }
            };
        document.addEventListener('DOMNodeInserted', areWeThereYet);
    }

    // wait and call instrumentation or detection
    contentMessageActions.angularDetected = false;
    waitForAngularLoad(function () {
        if (document.getElementsByTagName('html')[0].getAttribute('birbal-ng-start') === 'true') {
            instrumentAngular();
        }
    });

    window.addEventListener('beforeunload', function () {
        // release resources
        receiver = undefined;
        contentMessageActions = undefined;
        window.removeEventListener('message', contentMsgListener);
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

}(window, document));