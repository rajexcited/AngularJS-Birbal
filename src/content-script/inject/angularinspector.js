/*global angular, BirbalMessage, window, document*/
window.inspectorExecutor = function (window, document) {
    'use strict';
    window.name = 'NG_DEFER_BOOTSTRAP!'.concat(window.name);
    /**
     * Birbal detects angular page, and notify with basic informations
     */
    var logger, contentMessageActions = {}, receiver, annotate, sendDependencyTree, httpBackendPromise, updateHttpBackend;
    /////////////////////////////////////////////////////////
    //            LOGGER FOR DEVELOPMENT
    /////////////////////////////////////////////////////////
    // get flag value set by birbal app
    function noop() {
        return undefined;
    }

    if (document.getElementsByTagName('html')[0].getAttribute('birbal-debug') === 'true') {
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
    updateHttpBackend = function (list) {
        httpBackendPromise = new Promise(function (resolve) {
            resolve(list);
        });
    };
    //init
    updateHttpBackend([]);
    logger.log('loading birbal inspector of AngularJS App. ');
    /////////////////////////////////////////////////////////
    //            BIRBAL SETUP
    /////////////////////////////////////////////////////////
    // listener and communication
    function toValidJSON(o) {
        var cache = [], ck = [], ind = 0;
        try {
            return JSON.parse(JSON.stringify(o, function (key, value) {
                if (typeof value === 'object' && value !== null) {
                    ind = cache.indexOf(value);
                    // Store value in our collection
                    cache.push(value);
                    ck.push(key);
                }
                return value;
            }));
        } catch (e) {
            throw new Error('circular reference found, \tObject' + ck.join('.') + ' is equal to Object' + ck.slice(0, ind + 1).join('.') + '\n' + e.stack);
        }
    }

    function broadcastMessage(info, task) {
        try {
            var msg = new BirbalMessage(info, 'angular-inspector', 'content-script', task);
            window.postMessage(msg, '*');
        } catch (e) {
            logger.error.bind(logger, 'collected data Object = ')(info);
            try {
                toValidJSON(msg);
                logger.error.bind(logger, 'broadcast error: ').call(logger, e);
            } catch (ee) {
                logger.error(ee);
            }
        }
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
        logger.log('in contentMsgListener-angular birbal ');
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
                throw new Error('arguments(task, actionCallBack) are not matching.');
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
        //if (contentMessageActions.pause !== undefined) {
        contentMessageActions.pause = false;
        //}
    });

    /**
     * disable plugin
     */
        // qq: when do i need this?
    receiver.actionOnTask('pauseAnalysis', function () {
        contentMessageActions.pause = true;
    });

    /**
     * update mock http list
     */
    receiver.actionOnTask('mockHttplist', function (message) {
        // update http list
        logger.log('http list update request');
        logger.table.bind('mock http list: ').call(logger, message);
        updateHttpBackend(message.msgDetails);
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
        var ngRootNode = document.getElementsByTagName('html')[0],
            attributes, appname, attrName, len;

        appname = ngRootNode.getAttribute('birbal-ng-module');
        ngRootNode = document.querySelector('.ng-scope');
        appname = appname || angular.element(ngRootNode).data('ngApp');
        if (!appname) {
            attributes = (ngRootNode && ngRootNode.attributes);
            if (attributes) {
                len = attributes.length;
                do {
                    len--;
                    attrName = attributes.item(len).name;
                    if (normalizeAngularAttr(attrName) === 'ngApp') {
                        appname = attributes.item(len).value;
                        break;
                    }
                } while (len);
            }
        }
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
        logger.log('instrumenting angular');
        annotateFinder();
        angular.module('ng')
            .config(['$provide', '$httpProvider', function ($provide, $httpProvider) {

                function fnreplacer(ignore, value) {
                    if (typeof value === "function") {
                        return 'fn: ' + (value.name || value.toString());
                    }
                    return value;
                }

                function toStringForm(arg) {
                    return JSON.stringify(arg, fnreplacer);
                }

                // initialize nb to send measures
                var nb, perf = window.performance;
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
                    asyncEval: {time: [], expr: []},
                    browserDefer: []
                };

                function sendDigestInfo() {
                    var digestInfo = JSON.stringify(nb.digest);
                    window.setTimeout(function () {
                        digestInfo = JSON.parse(digestInfo);
                        digestInfo.domUpdateTime = (perf.now() - digestInfo.endTime);
                        logger.info("digest ended, DOM update time taken in ms is " + digestInfo.domUpdateTime);
                        broadcastMessage(digestInfo, 'digestMeasures');
                    }, 2);
                }

                // instrument scope/rootScope
                $provide.decorator('$rootScope', ['$delegate', function ($delegate) {
                    var scopePrototype, ngWatch, ngWatchCollection, ngDigest, ngApply, ngEmit, ngBroadcast, ngEvalAsync,
                        watchCollectionExp;

                    /* $rootScope prototype initial reference version 1.2.4
                     https://github.com/angular/angular.js/blob/v1.2.4/src/ng/rootScope.js
                     supports: v1.2.4
                     */
                    scopePrototype = Object.getPrototypeOf($delegate);
                    // add watch collection here
                    ngWatch = scopePrototype.$watch;
                    scopePrototype.$watch = function (watchExp, l, o, prettyPrintExpression) {
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
                        watchstr = toStringForm(watchCollectionExp || prettyPrintExpression || watchExp.exp || watchExp);
                        // patch get and fn to trace
                        ngWatchGet = addedWatcher.get;
                        ngWatchFn = addedWatcher.fn;
                        ngWatchEq = !!addedWatcher.eq;

                        addedWatcher.get = function () {
                            if (contentMessageActions.pause) {
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
                            if (contentMessageActions.pause) {
                                ngWatchFn.apply(null, arguments);
                            } else {
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
                        if (contentMessageActions.pause) {
                            ngDigest.apply(scope, arguments);
                            return;
                        }
                        try {
                            nb.digest = {
                                scope: {},
                                asyncQueue: '',
                                postDigestQueue: toStringForm(scope.$$postDigestQueue)
                            };
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
                                evalAsync: nb.asyncEval.time,
                                browserDefer: nb.browserDefer
                            };
                            nb.digest.asyncQueue = nb.asyncEval.expr;
                            sendDigestInfo();
                            nb.applyStartTime = nb.applyEndTime = undefined;
                            nb.events.emit.length = 0;
                            nb.events.broadcast.length = 0;
                            nb.asyncEval.time.length = 0;
                            nb.asyncEval.expr.length = 0;
                            nb.browserDefer.length = 0;
                        }
                    };
                    ngApply = scopePrototype.$apply;
                    scopePrototype.$apply = function () {
                        if (contentMessageActions.pause) {
                            ngApply.apply(this, arguments);
                        } else {
                            nb.applyStartTime = perf.now();
                            ngApply.apply(this, arguments);
                            nb.applyEndTime = perf.now();
                        }
                    };
                    ngEmit = scopePrototype.$emit;
                    scopePrototype.$emit = function (name) {
                        if (contentMessageActions.pause) {
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
                        if (contentMessageActions.pause) {
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
                    function asyncExprStringify(a) {
                        var m = a;
                        if (a && typeof a === 'object') {
                            m = {};
                            m.expression = a.expression;
                            m.scope = a.scope.$id;
                        }
                        return toStringForm(m);
                    }
                    scopePrototype.$evalAsync = function (expr) {
                        ngEvalAsync.apply(this, arguments);
                        if (!contentMessageActions.pause) {
                            nb.asyncEval.time.push(perf.now());
                            nb.asyncEval.expr.push(asyncExprStringify(expr));
                        }
                    };
                    return $delegate;
                }]);

                //qq: how can i analyze http with my digest cycle
                // register the interceptor as a service
                if ($httpProvider && $httpProvider.interceptors) {
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
                                if (!contentMessageActions.pause) {
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
                }

                // $browser to capture async task
                $provide.decorator('$browser', ['$delegate', function ($delegate) {
                    var ngDefer = $delegate.defer;
                    var wrapper = function () {
                        ngDefer.apply(null, arguments);
                        if (!contentMessageActions.pause) {
                            nb.browserDefer.push(perf.now());
                        }
                    };
                    wrapper.prototype = ngDefer.prototype;
                    wrapper.cancel = ngDefer.cancel;
                    $delegate.defer = wrapper;
                    return $delegate;
                }]);
            }]);
    }

    ////////////////////////////////////////////////////////////////////
    //  START INSPECTING PAGE FOR ANGULAR - onload, beforeunload
    //  annotate is use for angular providers
    /////////////////////////////////////////////////////////////////////
    function annotateFinder() {
        annotate = annotate || angular.injector().annotate;
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
    //      FIND dependency tree for app
    // referenced from https://github.com/filso/ng-dependency-graph
    /////////////////////////////////////////////////////////////////////
    sendDependencyTree = function (appNames) {
        var metadata = {
            apps: [],
            modules: []
        };

        function createModule(name) {
            var exist = false;
            for (var i = 0; i < metadata.modules.length; i++) {
                if (metadata.modules[i].name === name) {
                    exist = true;
                    break;
                }
            }

            if (exist || name === undefined) {
                return;
            }

            var module = angular.module(name);

            var moduleData = {
                name: name,
                deps: module.requires,
                components: []
            };

            processModule(moduleData);
            metadata.modules.push(moduleData);

            angular.forEach(module.requires, function (mod) {
                createModule(mod);
            });

        }

        function addDeps(moduleData, name, depsSrc, type) {
            if (typeof depsSrc === 'function') {
                var annotated = annotate(depsSrc);
                moduleData.components.push({
                    name: name,
                    deps: typeof annotated[0] === 'function' ? [] : annotated,
                    type: type
                });
                // Array or empty
            } else if (Array.isArray(depsSrc)) {
                var deps = depsSrc.slice(0, -1);
                moduleData.components.push({
                    name: name,
                    deps: deps,
                    type: type
                });
            } else {
                moduleData.components.push({
                    name: name,
                    type: type
                });
            }
        }

        function processModule(moduleData) {
            var moduleName = moduleData.name;
            var module = angular.module(moduleName);

            // For old versions of AngularJS the property is called 'invokeQueue'
            var invokeQueue = module._invokeQueue || module.invokeQueue;

            angular.forEach(invokeQueue, function (item) {
                var compArgs = item[2];
                switch (item[0]) {
                    case '$provide':
                        switch (item[1]) {
                            case 'value':
                            case 'constant':
                                addDeps(moduleData, compArgs[0], compArgs[1], 'value');
                                break;

                            default:
                                addDeps(moduleData, compArgs[0], compArgs[1], 'service');
                                break;
                        }
                        break;

                    case '$filterProvider':
                        addDeps(moduleData, compArgs[0], compArgs[1], 'filter');
                        break;
                    case '$animateProvider':
                        addDeps(moduleData, compArgs[0], compArgs[1], 'animation');
                        break;
                    case '$controllerProvider':
                        addDeps(moduleData, compArgs[0], compArgs[1], 'controller');
                        break;
                    case '$compileProvider':
                        if (item[1] === 'directive') {
                            if (compArgs[1].constructor === Object) {
                                // old angular version may support it. but removing support from here
                                logger.error('syntax incorrect - directive is not a func, ' + compArgs[0]);
                            } else {
                                addDeps(moduleData, compArgs[0], compArgs[1], 'directive');
                            }
                        } else {
                            addDeps(moduleData, compArgs[0], null, 'directive');
                        }
                        break;
                    case '$injector':
                        // invoke, ignore
                        break;
                    default:
                        logger.warn('unknown dependency type');
                        logger.warn(arguments);
                        break;
                }
            });

        }

        function getMetadata(appNames) {
            appNames.forEach(function (appName) {
                if (metadata.apps.indexOf(appName) === -1) {
                    metadata.apps.push(appName);
                    createModule(appName);
                }
            });
            window.metadata = metadata;
            logger.info.bind(logger, 'dependency metaData:  ').call(logger, metadata);
            return metadata;
        }

        annotateFinder();
        broadcastMessage(getMetadata(appNames), 'dependencyTree');
    };
    ////////////////////////////////////////////////////////////////////
    //      START INSPECTING PAGE FOR ANGULAR - onload
    /////////////////////////////////////////////////////////////////////
    function generateXPath(element) {
        logger.log.bind(logger, 'request xPath: ').call(logger, element);
        if (!element || element.id === undefined) {
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
                logger.log.bind(logger, 'xPath of parent: ').call(logger, element.parentNode);
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
        logger.log('starting inspection ');
        contentMessageActions.angularDetected = true;
        // quick messaging
        var msg = {};
        // get ANGULAR basic details
        msg.ngVersion = window.angular && window.angular.version;
        msg.ngDetected = !!msg.ngVersion;
        msg.ngModule = '';
        if (contentMessageActions.resumeBootstrap) {
            logger.log('requesting to resume bootstrap in inspectAngular');
            contentMessageActions.resumeBootstrap();
        }
        if (msg.ngDetected) {
            msg.ngModule = getAngularApp();
            msg.ngRootNode = generateXPath(document.querySelector('.ng-scope'));
            sendDependencyTree(msg.ngModule.split(','));
        } else {
            window.name = window.name.replace(/^NG_DEFER_BOOTSTRAP!/, '');
        }
        // send inspection data
        broadcastMessage(msg, 'ngDetect');
        logger.log('ngDetect message or cleanup');
    }

    function handleHttpInjector() {
        var oldList, backend;
        logger.log('register birbal app to http backend mock service');
        // register birbalApp to do specific task or action
        angular.module('birbalApp', ['ngMockE2E'])
            .config(['$provide', function ($provide) {
                logger.log('inititializing decorator');
                $provide.decorator('$httpBackend', [function () {
                    logger.log('skinning mock version of httpbackend with backend? ' + !!backend);

                    function myBackend() {
                        backend.apply(null, arguments);
                    }

                    Object.getOwnPropertyNames(backend).forEach(function (prop) {
                        try {
                            if (typeof backend[prop] === 'function') {
                                myBackend[prop] = function () {
                                    return backend[prop].apply(this, arguments);
                                };
                            } else {
                                myBackend[prop] = backend[prop];
                            }
                        } catch (e) {
                        }
                    });

                    return myBackend;
                }]);
            }]);


        function isModified(list) {
            var len = list.length;
            if (list) {
                // list exists - now verify any changes
                if (!oldList || oldList.length !== len) {
                    // shallow compare
                    return false;
                } else {
                    // lengths are same
                    var listMap = list.map(function (item) {
                        return JSON.stringify(item);
                    });
                    var oldListMap = oldList.map(function (item) {
                        return JSON.stringify(item);
                    });
                    var checker = [], i, ind;
                    for (i = 0; i < len; i++) {
                        ind = oldListMap.indexOf(listMap[i]);
                        if (ind !== -1 && checker.indexOf(ind) === -1) {
                            checker.push(ind);
                        }
                    }
                    if (checker.length !== len) {
                        // diff data
                        return false;
                    }
                }
            }
            return true;
        }

        function toHeaderObject(headerArray) {
            headerArray.forEach(function (item) {
                var hh = item.split(':');
                bb[hh[0]] = hh[1];
            });
        }

        function useNewBackend() {
            // reset the definition off http mock
            backend = angular.injector(['ngMockE2E']).get('$httpBackend');
        }

        function toURLStringOrRegExp(url) {
            if (url && url instanceof Object) {
                return new RegExp(url.pattern, url.flags);
            }
            return url;
        }

        /*expose to injector action task*/
        updateHttpBackend = function (list) {
            logger.log('update list request recieved');
            if (!isModified(list)) {
                logger.log('list is modified - updating definitions');
                oldList = list;
                useNewBackend();
                list.forEach(function (httpItem) {
                    backend.when(httpItem.method.toUpperCase(), toURLStringOrRegExp(httpItem.url), toHeaderObject(httpItem.headers))
                        .respond(Number(httpItem.status), httpItem.response);
                });
                backend.whenGET(/.*/).passThrough();
                backend.whenPOST(/.*/).passThrough();
                backend.whenPUT(/.*/).passThrough();
                backend.whenDELETE(/.*/).passThrough();
                backend.whenJSONP(/.*/).passThrough();
                backend.whenPATCH(/.*/).passThrough();
                backend.whenHEAD(/.*/).passThrough();
            }
        };
        // page load setup
        // scene#1:  prelist
        logger.log.bind(logger, 'promise to init list: ').call(logger, httpBackendPromise);
        httpBackendPromise.then(function (list) {
            return updateHttpBackend(list);
        });
        // clean up
        httpBackendPromise = undefined;
    }

    function addBirbalModule() {
        contentMessageActions.resumeBootstrap = function () {
            if (angular.resumeBootstrap) {
                // bootstrap was on halt
                logger.log('resuming now');
                angular.resumeBootstrap(['birbalApp']);
                delete contentMessageActions.resumeBootstrap;
            }
        };
        // init
        logger.log('adding loader, pausing bootstrap and init');
        initMock();

        function initMock() {
            try {
                window.injectMock(window, window.angular);
                window.injectMock = undefined;
                handleHttpInjector();
            } catch (e) {
                // retry until successful
                window.setTimeout(initMock, 30);
            }
        }

        contentMessageActions.resumeBootstrap();
    }

    ///////// when page is ready with init DOM
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

    function instrumentBootStrap() {
        var bootstrapping = angular.bootstrap;
        logger.log('instrumenting manual bootstrap');
        function bootstrap(element, module) {
            try {
                logger.log('manual bootstrapping');
                var returnValue = bootstrapping.apply(null, arguments);
                window.setTimeout(inspectAngular, 1);
                return returnValue;
            } catch (e) {
                logger.error('error in manual bootstrap\n' + e.stack);
                contentMessageActions.resumeBootstrap(true);
                throw e;
            } finally {
                angular.element(element).data('ng-app', [].concat(module).join(','));
                angular.bootstrap = bootstrapping;
                logger.log('reverting it back. is it really? ' + (bootstrap !== angular.bootstrap));
                bootstrapping = undefined;
            }
        }

        angular.bootstrap = bootstrap;
    }

    function instrumentActiveDependency() {
        annotateFinder();
        logger.log('instrumenting dependency');
        angular.module('ng')
            .config(['$provide', function ($provide) {
                var ngPFactory, ngPService, ngPProvider, depstimeout,
                    deps = [];
                logger.log('dependency config');
                $provide.decorator('$controller', ['$delegate', function ($delegate) {
                    return (function (name) {
                        if (typeof name === 'string') {
                            deps.push('controller:' + name);
                        }
                        return $delegate.apply(this, arguments);
                    });
                }]);

                ngPFactory = $provide.factory;
                $provide.factory = function (name) {
                    var factRet = ngPFactory.apply(this, arguments),
                        fact$get = factRet.$get,
                        l, factGet;

                    factGet = function () {
                        deps.push('factory:' + name);
                        try {
                            return fact$get.apply(this, arguments);
                        } catch (e) {
                            logger.warn(e);
                        } finally {
                            sendActiveDeps();
                        }
                    };
                    if (angular.isArray(fact$get)) {
                        l = fact$get.length - 1;
                        fact$get = fact$get[l];
                        factRet.$get[l] = factGet;
                    } else {
                        var annotated$get = annotate(fact$get);
                        annotated$get.push(factGet);
                        factRet.$get = annotated$get;
                    }
                    return factRet;
                };

                ngPService = $provide.service;
                $provide.service = function (name) {
                    var servRet = ngPService.apply(this, arguments),
                        serv$get = servRet.$get,
                        l, servGet;

                    servGet = function () {
                        deps.push('service:' + name);
                        try {
                            return serv$get.apply(this, arguments);
                        } catch (e) {
                            logger.warn(e);
                        } finally {
                            sendActiveDeps();
                        }
                    };
                    if (angular.isArray(serv$get)) {
                        l = serv$get.length - 1;
                        serv$get = serv$get[l];
                        servRet.$get[l] = servGet;
                    } else {
                        var annotated$get = annotate(serv$get);
                        annotated$get.push(servGet);
                        servRet.$get = annotated$get;
                    }

                    return servRet;
                };

                ngPProvider = $provide.provider;
                $provide.provider = function (name) {
                    var prvdRet = ngPProvider.apply(this, arguments),
                        prvd$get = prvdRet.$get,
                        l, prvdGet;

                    prvdGet = function () {
                        deps.push('provider:' + name);
                        try {
                            return prvd$get.apply(this, arguments);
                        } catch (e) {
                            logger.warn(e);
                        } finally {
                            sendActiveDeps();
                        }
                    };
                    if (angular.isArray(prvd$get)) {
                        l = prvd$get.length - 1;
                        prvd$get = prvd$get[l];
                        prvdRet.$get[l] = prvdGet;
                    } else {
                        var annotated$get = annotate(prvd$get);
                        annotated$get.push(prvdGet);
                        prvdRet.$get = annotated$get;
                    }

                    return prvdRet;
                };

                function sendActiveDeps() {
                    if (!depstimeout) {
                        depstimeout = window.setTimeout(function () {
                            broadcastMessage(deps, 'activeDependencies');
                            depstimeout = undefined;
                        }, 1.3 * 1000);
                    }
                }
            }]);
    }

    // wait and call instrumentation or detection
    contentMessageActions.angularDetected = false;
    waitForAngularLoad(function () {
        // angular detected
        logger.log('window name to findout auto bootstrap is started or not. ' + window.name);
        // add spy to bootstrap to detect manual bootstrap
        instrumentBootStrap();
        logger.log('instrumented bootstrap');
        instrumentActiveDependency();
        addBirbalModule();
        logger.log('bootstrap instrumented and added birbal module.');
        //if (document.getElementsByTagName('html')[0].getAttribute('birbal-ng-start') === 'true') {
        // instrument and resume
        contentMessageActions.pause = false;
        instrumentAngular();
        logger.log('instrumented NG');
        //}
    });

    window.addEventListener('beforeunload', function () {
        // release resources
        receiver = undefined;
        contentMessageActions = undefined;
        window.removeEventListener('message', contentMsgListener);
    });
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

};