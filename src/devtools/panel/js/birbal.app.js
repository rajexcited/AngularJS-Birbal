/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    'use strict';

    angular.module('birbal-app', ['background-service-app', 'panel-view-app'])
        .controller('panelViewController', ['$scope', 'backgroundService', '$timeout', '$rootScope',
            function ($scope, backgroundService, $timeout, $rootScope) {
                // default first message on inspect tab load, letting app know I'm ready
                backgroundService.informBackground(null, 'init', birbalJS.END_POINTS.BACKGROUND);
                var actionList = {}, digestMesures = [];
                $scope.settings = {
                    digestDebounce: 100
                };
                $scope.onwinload = {};
                /////////////////////////////////////////////////////////
                //            panel action listener
                /////////////////////////////////////////////////////////
                $rootScope.$on('panelAction', function (event, data) {
                    // apply accepts only array as data arguments
                    actionList[data.action].apply(null, [data.args]);
                });

                actionList.changePanelView = function (viewDetails) {
                    viewDetails = viewDetails.page ? viewDetails : {page: viewDetails};

                    // sidebar item
                    $('li[select-view]').removeClass('active');
                    $('li[select-view="' + viewDetails.page + '"]').addClass('active');

                    $scope.$applyAsync(function () {
                        $scope.view = viewDetails.page;
                        //initializing csInfo for template data for first time or after cleanup
                        $scope.csInfo = $scope.csInfo || {};
                        angular.extend($scope.csInfo, viewDetails.data);
                    });
                };

                actionList.clearResources = function () {
                    // clear app data
                    digestMesures.length = 0;
                    // digestMeasuresBox = digestTmplData = undefined;
                    $scope.$applyAsync(function () {
                        $scope.view = '';
                        delete $scope.csInfo;
                        actionList.enabled = false;
                        lastMesuredIndex = 0;
                        $timeout.cancel(timeoutpromise);
                        timeoutpromise = undefined;
                        $scope.digestMeasures = new DigestMeasure();
                    });
                };
                // first timeinitialization
                //actionList.clearResources();

                actionList.digestMeasure = function (measureDetail) {
                    measureDetail.startTime = Math.round(measureDetail.startTime);
                    measureDetail.endTime = Math.round(measureDetail.endTime);
                    measureDetail.duration = measureDetail.endTime - measureDetail.startTime;
                    measureDetail.prevApplyEnd = Math.round(measureDetail.prevApplyEnd);
                    // scope
                    var simplifiedWatcher;
                    angular.forEach(measureDetail.scope, function (scope, id) {
                        // find most used watcher
                        scope.watchers.forEach(function (watch, ind) {
                            // find get#, fn#, timetoget, timetofn, eq
                            simplifiedWatcher = {
                                get: {
                                    len: watch.length,
                                    duration: 0
                                },
                                fn: {
                                    len: 0,
                                    duration: 0
                                },
                                exp: '',
                                eq: (watch[0] && watch[0].eq)
                            };
                            watch.forEach(function (onewatch) {
                                simplifiedWatcher.get.duration += Math.round(onewatch.get);
                                if (onewatch.fn) {
                                    simplifiedWatcher.fn.duration += Math.round(onewatch.fn);
                                    simplifiedWatcher.fn.len++;
                                    simplifiedWatcher.exp = onewatch.exp;
                                }
                            });
                            scope.watchers[ind] = simplifiedWatcher;
                        });
                    });
                    // events
                    measureDetail.events.broadcast.forEach(function () {

                    });
                    digestMesures.push(measureDetail);
                };

                actionList.httpMeasure = function (measureDetail) {
                    // add http ajax detail
                };
                /////////////////////////////////////////////////////////
                //            Sidebar actions
                /////////////////////////////////////////////////////////
                var sidebar = {};
                sidebar.disableme = function () {
                    actionList.clearResources();
                    backgroundService.informBackground(null, 'stopAnalysis', birbalJS.END_POINTS.BACKGROUND);
                };

                sidebar.changePanelView = function (viewName) {
                    if (!actionList.enabled && $scope.csInfo.ngModule && viewName !== 'settings') {
                        // register/enable/refresh
                        backgroundService.informBackground({
                            ngModule: $scope.csInfo.ngModule,
                            task: 'runAnalysis'
                        });
                        actionList.enabled = true;
                        analyzeDigestMeasures();
                    }
                    actionList.changePanelView(viewName);
                };

                //sidebar for html use
                $scope.sidebar = sidebar;
                /////////////////////////////////////////////////////////
                //            initpage view
                /////////////////////////////////////////////////////////
                $scope.initpage = {};
                $scope.initpage.enableMe = function () {
                    // register/enable/refresh
                    $scope.csInfo.ngModule = $scope.csInfo.ngModule || $scope.csInfo.ngModuleInput;
                    sidebar.changePanelView('dashboard');
                };

                /////////////////////////////////////////////////////////
                //            onWindowLoad view
                /////////////////////////////////////////////////////////
                $scope.$watch('onwinload.analyze', function tabRefreshHandler(newval) {
                    backgroundService.informBackground({
                            doAnalysis: !!newval,
                            task: 'doAnalysis'
                        },
                        null, birbalJS.END_POINTS.BACKGROUND);
                });

                $scope.onwinload.reloadPage = function () {
                    birbalJS.pageAction('reload');
                };
                /////////////////////////////////////////////////////////
                //            settings view
                /////////////////////////////////////////////////////////
                $scope.$watch('settings.properties', function scopePropSettingsHandler(newval) {
                    var sidebarAction = newval ? 'addSidebar' : 'removeSidebar';
                    birbalJS.setElementPanelAction(sidebarAction);
                });

                $scope.settings.reCalculateMeasures = function () {
                    $timeout.cancel(timeoutpromise);
                    timeoutpromise = undefined;
                    lastMesuredIndex = 0;
                    $scope.digestMeasures.initialize();

                    $scope.$evalAsync(function () {
                        analyzeDigestMeasures();
                    });
                };

                /////////////////////////////////////////////////////////
                //            digestMeasure- asyncQueue
                /////////////////////////////////////////////////////////
                var DigestMeasure = function () {
                    var self = this;
                    self.performanceTime = [];
                    this.initialize = function () {
                        self.max = {
                            watcherMeasures: {
                                scopes: {}
                            }
                        };
                        self.edr = undefined;
                    };
                    this.initialize();
                };

                DigestMeasure.prototype.toggleMeasureDetail = function ($event, eventscope, detailExpr) {
                    var details = $scope.$eval(detailExpr, eventscope);
                    if (!details.length) {
                        // do nothing
                        return;
                    }
                    eventscope.measure.showMeasureDetail = !eventscope.measure.showMeasureDetail;
                    eventscope.measure.boxDetails = details;
                };
                /////////////////////////////////////////////////////////
                //            analysis on data
                /////////////////////////////////////////////////////////
                var lastMesuredIndex,
                    timeoutpromise;

                function analyzeDigestMeasures() {
                    // create summary for digest
                    // expensive
                    var longest = $scope.digestMeasures.max.duration || 0;
                    // create array of digest rates with help of debounce range - find max for summary
                    // each array item value will be {startind:0, n:0}
                    var effectiveDRates = $scope.digestMeasures.edr = $scope.digestMeasures.edr || [];
                    // edr range : curr start - prev end < debounceTime
                    // ideally each digest cycle should debounce time with one another to have better performance - SIMPLE PAGE can achieve as no user inter-action
                    var prevEndtime = $scope.digestMeasures.performanceTime[lastMesuredIndex - 1] &&
                            $scope.digestMeasures.performanceTime[lastMesuredIndex - 1].endTime,
                    // prev or 0
                        edrind = effectiveDRates.length ? effectiveDRates.length - 1 : 0;
                    // watchers max computations
                    var watchmax = $scope.digestMeasures.max.watcherMeasures.counts =
                        $scope.digestMeasures.max.watcherMeasures.counts || {
                            dirty: 0,
                            total: 0,
                            dirtyexpensive: false,
                            totalexpensive: false
                        };
                    // scopes max computations
                    var maxnScopes = $scope.digestMeasures.max.watcherMeasures.scopes.total || 0;
                    var maxndirtyscopes = $scope.digestMeasures.max.watcherMeasures.scopes.dirty || 0;
                    // continue from where we left - do it only for new added ones
                    $scope.digestMeasures.performanceTime.slice(lastMesuredIndex)
                        .forEach(function (aDigest, ind, list) {
                            longest = longest < aDigest.duration ? aDigest.duration : longest;
                            // find prev end time
                            aDigest.endTime = aDigest.startTime + aDigest.duration;
                            prevEndtime = prevEndtime || aDigest.endTime;
                            if ((aDigest.startTime - prevEndtime) > $scope.settings.digestDebounce) {
                                // finish recording current and start new one
                                effectiveDRates[edrind].n = lastMesuredIndex + ind - effectiveDRates[edrind].startind;
                                effectiveDRates[edrind].endTime = prevEndtime;
                                edrind++;
                                effectiveDRates[edrind] = {
                                    startind: lastMesuredIndex + ind,
                                    startTime: aDigest.startTime
                                };
                            } else {
                                effectiveDRates[edrind] = effectiveDRates[edrind] || {
                                        startind: lastMesuredIndex + ind,
                                        startTime: aDigest.startTime
                                    };
                            }
                            prevEndtime = aDigest.endTime;
                            ///////////////////////////////////// end of digest
                            ///////// watch measures
                            if (watchmax.dirty < aDigest.watcherMeasures.counts.dirty) {
                                watchmax.dirty = aDigest.watcherMeasures.counts.dirty;
                                watchmax.dirtyexpensive = longest === aDigest.duration;
                            }
                            if (watchmax.total < aDigest.watcherMeasures.counts.total) {
                                watchmax.total = aDigest.watcherMeasures.counts.total;
                                watchmax.totalexpensive = longest === aDigest.duration;
                            }
                            var watchDirty = aDigest.watcherMeasures.expForDirty;
                            aDigest.watcherMeasures.dirtyMaxTime = watchDirty.length ? Math.round(watchDirty[watchDirty.length - 1].expTime -
                                watchDirty[watchDirty.length - 1].expStart) : 0;
                            /////////////////////////////////////////// end of watch
                            /////scopes
                            maxnScopes = maxnScopes > aDigest.watcherMeasures.scopes.total ?
                                maxnScopes : aDigest.watcherMeasures.scopes.total;
                            var dsids = Object.keys(aDigest.watcherMeasures.scopes.dirty).length;
                            maxndirtyscopes = maxndirtyscopes > dsids ? maxndirtyscopes : dsids;
                            /////////////////////////////////////////////////////////////////////////////////////////////
                            ////////////////end of foreach
                        });
                    lastMesuredIndex = $scope.digestMeasures.performanceTime.length;
                    $scope.digestMeasures.max.duration = longest;
                    $scope.digestMeasures.max.watcherMeasures.scopes.total = maxnScopes;
                    $scope.digestMeasures.max.watcherMeasures.scopes.dirty = maxndirtyscopes;
                    var maxedr = $scope.digestMeasures.max.edr || {
                            duration: 0,
                            n: 0
                        };

                    if (edrind) {
                        effectiveDRates[edrind].n = lastMesuredIndex - effectiveDRates[edrind].startind;
                        effectiveDRates[edrind].endTime = prevEndtime;
                        // find max time range
                        effectiveDRates.forEach(function (edr, ei) {
                            edr.duration = edr.endTime - edr.startTime;
                            maxedr = (maxedr.duration > edr.duration) ? maxedr :
                                ((edr.n > 1) ? edr :
                                    (maxedr.n > 1 ? maxedr : edr));
                        });
                    }
                    // effective digest rate:  digestMeasures.max.edr.n / digestMeasures.max.edr.duration
                    $scope.digestMeasures.max.edr = maxedr;
                    timeoutpromise = $timeout(analyzeDigestMeasures, 500);
                }

                /////////////////////////////////////////////////////////
                /////////////////////////////////////////////////////////

            }
        ])
        .filter('removeNewLine', function () {
            return function (exp) {
                if (typeof exp !== 'string') {
                    exp = exp.toString();
                }
                exp = exp.replace(/\n/g, '');
                return exp;
            };
        });

}(angular, birbalJS));
