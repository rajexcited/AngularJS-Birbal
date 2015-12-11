/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    'use strict';

    angular.module('birbal-app', ['background-service-app', 'panel-view-app'])
        .controller('panelViewController',
            ['$scope', 'backgroundService', '$rootScope',
                function ($scope, backgroundService, $rootScope) {
                    // default first message on inspect tab load, letting app know I'm ready
                    backgroundService.informBackground(null, 'init', birbalJS.END_POINTS.BACKGROUND);

                    var actionList = {},
                        digestMeasures;
                    $scope.digestMeasures = digestMeasures = [];
                    /////////////////////////////////////////////////////////
                    //            panel action listener
                    /////////////////////////////////////////////////////////
                    $rootScope.$on('panelAction', function (event, detail) {
                        // apply accepts only array as data arguments
                        actionList[detail.action].apply(null, [detail.args]);
                    });

                    // updating scope
                    actionList.changePanelView = function (viewDetails) {
                        viewDetails = (typeof viewDetails.page === 'string') ? {page: viewDetails} : viewDetails;

                        // side bar item
                        $('li[select-view]').removeClass('active');
                        $('li[select-view="' + viewDetails.page + '"]').addClass('active');

                        $scope.$applyAsync(function () {
                            $scope.view = viewDetails.page;
                            //initializing csInfo for template data for first time or after cleanup
                            angular.extend($scope.csInfo, viewDetails.data);
                        });
                    };

                    actionList.clearResources = function () {
                        // clear app data
                        $scope.view = '';
                        //delete $scope.csInfo;
                        digestMeasures.length = 0;
                        $scope.csInfo = {};

                        // digestMeasuresBox = digestTmplData = undefined;
                        //$scope.$applyAsync(function () {
                        //actionList.enabled = false;
                        //lastMesuredIndex = 0;
                        //$timeout.cancel(timeoutpromise);
                        //timeoutpromise = undefined;
                        //$scope.digestMeasures = new DigestMeasure();
                        //});
                    };

                    actionList.digestMeasure = function (digestDetail) {
                        var simplifiedWatcher,
                            prevDigestDetail = digestMeasures[digestMeasures.length - 1] || {};
                        digestDetail.startTime = Math.round(digestDetail.startTime);
                        digestDetail.endTime = Math.round(digestDetail.endTime);
                        digestDetail.duration = digestDetail.endTime - digestDetail.startTime;
                        prevDigestDetail.applyEndTime = digestDetail.prevApplyEnd && Math.round(digestDetail.prevApplyEnd);
                        digestDetail.prevApplyEnd = undefined;
                        // scope
                        angular.forEach(digestDetail.scope, function (scope, id) {
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
                        digestDetail.events.broadcast.forEach(function () {

                        });
                        digestMeasures.push(digestDetail);
                    };

                    actionList.httpMeasure = function (httpDetail) {
                        // add http ajax detail
                    };
                    /////////////////////////////////////////////////////////
                    //            sidebar actions
                    /////////////////////////////////////////////////////////
                    $scope.sidebar = {
                        disableMe: function () {
                            backgroundService.informBackground(null, 'stopAnalysis');
                            // do not clear to allow user for further analysis after stopped
                            //actionList.clearResources();
                        },
                        changePanelView: function (viewName) {
                            //if (!actionList.enabled && $scope.csInfo.ngModule && viewName !== 'settings') {
                            //    // register/enable/refresh
                            //    backgroundService.informBackground({
                            //        ngModule: $scope.csInfo.ngModule,
                            //        task: 'runAnalysis'
                            //    });
                            //    actionList.enabled = true;
                            //    analyzeDigestMeasures();
                            //}
                            actionList.changePanelView(viewName);
                        },
                        enableMe: function () {
                            // register/enable/refresh
                            $scope.csInfo.ngModule = $scope.csInfo.ngModule || $scope.csInfo.ngModuleInput;
                            backgroundService.informBackground({doAnalysis: true}, 'doAnalysis', birbalJS.END_POINTS.BACKGROUND);
                            birbalJS.pageAction('reload');
                        }
                    };

                    /////////////////////////////////////////////////////////
                    //            settings view
                    /////////////////////////////////////////////////////////
                    $scope.settings = {
                        digestDebounce: 100,
                        showScopeToElement: false
                    };
                    $scope.$watch('settings.showScopeToElement', function scopePropSettingsHandler(newval) {
                        var sidebarAction = newval ? 'addScopeToElementPanel' : 'removeScopeToElementPanel';
                        birbalJS.setElementPanelAction(sidebarAction);
                    });

                    $scope.settings.reloadPage = function () {
                        birbalJS.pageAction('reload');
                    };

                    //$scope.settings.reCalculateMeasures = function () {
                    //    $timeout.cancel(timeoutpromise);
                    //    timeoutpromise = undefined;
                    //    lastMesuredIndex = 0;
                    //    $scope.digestMeasures.initialize();
                    //
                    //    $scope.$evalAsync(function () {
                    //        analyzeDigestMeasures();
                    //    });
                    //};

                    /////////////////////////////////////////////////////////
                    //            digestMeasure- asyncQueue
                    /////////////////////////////////////////////////////////
                    //var DigestMeasure = function () {
                    //    var self = this;
                    //    self.performanceTime = [];
                    //    this.initialize = function () {
                    //        self.max = {
                    //            watcherMeasures: {
                    //                scopes: {}
                    //            }
                    //        };
                    //        self.edr = undefined;
                    //    };
                    //    this.initialize();
                    //};
                    //
                    //DigestMeasure.prototype.toggleMeasureDetail = function ($event, eventscope, detailExpr) {
                    //    var details = $scope.$eval(detailExpr, eventscope);
                    //    if (!details.length) {
                    //        // do nothing
                    //        return;
                    //    }
                    //    eventscope.measure.showMeasureDetail = !eventscope.measure.showMeasureDetail;
                    //    eventscope.measure.boxDetails = details;
                    //};
                    /////////////////////////////////////////////////////////
                    //            analysis on data
                    /////////////////////////////////////////////////////////
                    //var lastMesuredIndex,
                    //    timeoutpromise;
                    //
                    //function analyzeDigestMeasures() {
                    //    // create summary for digest
                    //    // expensive
                    //    var longest = $scope.digestMeasures.max.duration || 0;
                    //    // create array of digest rates with help of debounce range - find max for summary
                    //    // each array item value will be {startind:0, n:0}
                    //    var effectiveDRates = $scope.digestMeasures.edr = $scope.digestMeasures.edr || [];
                    //    // edr range : curr start - prev end < debounceTime
                    //    // ideally each digest cycle should debounce time with one another to have better performance - SIMPLE PAGE can achieve as no user inter-action
                    //    var prevEndtime = $scope.digestMeasures.performanceTime[lastMesuredIndex - 1] &&
                    //            $scope.digestMeasures.performanceTime[lastMesuredIndex - 1].endTime,
                    //    // prev or 0
                    //        edrind = effectiveDRates.length ? effectiveDRates.length - 1 : 0;
                    //    // watchers max computations
                    //    var watchmax = $scope.digestMeasures.max.watcherMeasures.counts =
                    //        $scope.digestMeasures.max.watcherMeasures.counts || {
                    //            dirty: 0,
                    //            total: 0,
                    //            dirtyexpensive: false,
                    //            totalexpensive: false
                    //        };
                    //    // scopes max computations
                    //    var maxnScopes = $scope.digestMeasures.max.watcherMeasures.scopes.total || 0;
                    //    var maxndirtyscopes = $scope.digestMeasures.max.watcherMeasures.scopes.dirty || 0;
                    //    // continue from where we left - do it only for new added ones
                    //    $scope.digestMeasures.performanceTime.slice(lastMesuredIndex)
                    //        .forEach(function (aDigest, ind, list) {
                    //            longest = longest < aDigest.duration ? aDigest.duration : longest;
                    //            // find prev end time
                    //            aDigest.endTime = aDigest.startTime + aDigest.duration;
                    //            prevEndtime = prevEndtime || aDigest.endTime;
                    //            if ((aDigest.startTime - prevEndtime) > $scope.settings.digestDebounce) {
                    //                // finish recording current and start new one
                    //                effectiveDRates[edrind].n = lastMesuredIndex + ind - effectiveDRates[edrind].startind;
                    //                effectiveDRates[edrind].endTime = prevEndtime;
                    //                edrind++;
                    //                effectiveDRates[edrind] = {
                    //                    startind: lastMesuredIndex + ind,
                    //                    startTime: aDigest.startTime
                    //                };
                    //            } else {
                    //                effectiveDRates[edrind] = effectiveDRates[edrind] || {
                    //                        startind: lastMesuredIndex + ind,
                    //                        startTime: aDigest.startTime
                    //                    };
                    //            }
                    //            prevEndtime = aDigest.endTime;
                    //            ///////////////////////////////////// end of digest
                    //            ///////// watch measures
                    //            if (watchmax.dirty < aDigest.watcherMeasures.counts.dirty) {
                    //                watchmax.dirty = aDigest.watcherMeasures.counts.dirty;
                    //                watchmax.dirtyexpensive = longest === aDigest.duration;
                    //            }
                    //            if (watchmax.total < aDigest.watcherMeasures.counts.total) {
                    //                watchmax.total = aDigest.watcherMeasures.counts.total;
                    //                watchmax.totalexpensive = longest === aDigest.duration;
                    //            }
                    //            var watchDirty = aDigest.watcherMeasures.expForDirty;
                    //            aDigest.watcherMeasures.dirtyMaxTime = watchDirty.length ? Math.round(watchDirty[watchDirty.length - 1].expTime -
                    //                watchDirty[watchDirty.length - 1].expStart) : 0;
                    //            /////////////////////////////////////////// end of watch
                    //            /////scopes
                    //            maxnScopes = maxnScopes > aDigest.watcherMeasures.scopes.total ?
                    //                maxnScopes : aDigest.watcherMeasures.scopes.total;
                    //            var dsids = Object.keys(aDigest.watcherMeasures.scopes.dirty).length;
                    //            maxndirtyscopes = maxndirtyscopes > dsids ? maxndirtyscopes : dsids;
                    //            /////////////////////////////////////////////////////////////////////////////////////////////
                    //            ////////////////end of foreach
                    //        });
                    //    lastMesuredIndex = $scope.digestMeasures.performanceTime.length;
                    //    $scope.digestMeasures.max.duration = longest;
                    //    $scope.digestMeasures.max.watcherMeasures.scopes.total = maxnScopes;
                    //    $scope.digestMeasures.max.watcherMeasures.scopes.dirty = maxndirtyscopes;
                    //    var maxedr = $scope.digestMeasures.max.edr || {
                    //            duration: 0,
                    //            n: 0
                    //        };
                    //
                    //    if (edrind) {
                    //        effectiveDRates[edrind].n = lastMesuredIndex - effectiveDRates[edrind].startind;
                    //        effectiveDRates[edrind].endTime = prevEndtime;
                    //        // find max time range
                    //        effectiveDRates.forEach(function (edr, ei) {
                    //            edr.duration = edr.endTime - edr.startTime;
                    //            maxedr = (maxedr.duration > edr.duration) ? maxedr :
                    //                ((edr.n > 1) ? edr :
                    //                    (maxedr.n > 1 ? maxedr : edr));
                    //        });
                    //    }
                    //    // effective digest rate:  digestMeasures.max.edr.n / digestMeasures.max.edr.duration
                    //    $scope.digestMeasures.max.edr = maxedr;
                    //    timeoutpromise = $timeout(analyzeDigestMeasures, 500);
                    //}

                    /////////////////////////////////////////////////////////
                    /////////////////////////////////////////////////////////

                }
            ])
        //.filter('removeNewLine', function () {
        //    return function (exp) {
        //        if (typeof exp !== 'string') {
        //            exp = exp.toString();
        //        }
        //        exp = exp.replace(/\n/g, '');
        //        return exp;
        //    };
        //})
    ;

}(angular, birbalJS));