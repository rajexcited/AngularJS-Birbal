/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    "use strict";

    angular.module('birbal-app', ['background-service-app', 'panel-view-app', 'views.performance.digest', 'birbalFilters.app', 'rangeSlider.app', 'searchCriteria.watch.app', 'ngDependencyGraph', 'measure.digest.app', 'sortable-column.component', 'dataNotifier.promise.factory'])
        .controller('panelViewController',
            ['$scope', 'backgroundService', '$rootScope', 'digestView', '$interval', 'watchMeasureLogFactory', '$filter', 'DATA_NAMES', 'dataNotifierPromise',
                function ($scope, backgroundService, $rootScope, digestView, $interval, watchMeasureLogFactory, $filter, DATA_NAMES, dataNotifierPromise) {
                    // default first message on inspect tab load, letting app know I'm ready
                    backgroundService.informBackground(null, 'panelInit');
                    /////////////////////////////////////////////////////////
                    //            panel action listener
                    /////////////////////////////////////////////////////////
                    /**
                     * @link changeViewActionListener
                     *  @param pageName{string} page name to change view must
                     *  @param ngDetectData {object} angular detection detail to display to user optional
                     */
                    function changeViewActionListener(pageName) {

                        if (!pageName) {
                            // dashboard or init page
                            if ($rootScope.csInfo.ngDetected) {
                                pageName = 'dashboard';
                            } else {
                                pageName = 'nbEnable';
                            }
                            // making sure to not change user choice and init
                            $rootScope.csInfo = angular.extend({pause: true}, $rootScope.csInfo);
                        }
                        if (angular.element('.sidebar-collapse').length === 0) {
                            // collapse main header
                            angular.element('.main-header a[data-toggle="offcanvas"]').click();
                        }
                        $scope.$emit('render-charts-dashboard');
                        $scope.$applyAsync(function () {
                            $scope.view = pageName;
                        });
                    }

                    $rootScope.$on('ngAppDetails', function (event, ngDetectData) {
                        $scope.$applyAsync(function () {
                            // merge new data with old one. do not change old non related data - using it to save for session
                            $rootScope.csInfo = angular.extend({}, $rootScope.csInfo, ngDetectData);
                            clearResources();
                            changeViewActionListener();
                        });
                    });

                    $rootScope.$on('performance.resumeAnalysis', function () {
                        $scope.$applyAsync(function () {
                            $rootScope.csInfo = angular.extend({}, $rootScope.csInfo, {pause: false});
                        });
                    });

                    function clearResources() {
                        // clear app data
                        digestView.resetView();
                        watchMeasureLogFactory.reset();
                    }

                    /////////////////////////////////////////////////////////
                    //            sidebar actions
                    /////////////////////////////////////////////////////////
                    $scope.sidebarActions = {
                        pauseMyAnalysis: function () {
                            backgroundService.informBackground(null, 'performance.pauseAnalysis');
                            $rootScope.csInfo.pause = true;
                        },
                        resumeMyAnalysis: function () {
                            backgroundService.informBackground(null, 'performance.resumeAnalysis');
                            $rootScope.csInfo.pause = false;
                        },
                        changePanelView: changeViewActionListener
                    };

                    /////////////////////////////////////////////////////////
                    //            settings view
                    /////////////////////////////////////////////////////////
                    function getDebounceTime() {
                        digestView.getDebounceTime().then(function (debounceTime) {
                            birbalJS.logger.log("debounce time is " + debounceTime);
                            $scope.$applyAsync(function () {
                                $scope.settings.digestDebounceTime = debounceTime;
                            });
                        });
                    }

                    $scope.settings = {
                        debounceChanged: function () {
                            if ($scope.settings.digestDebounceTime && $scope.settings.digestDebounceTime > 0) {
                                digestView.updateDebounceTime($scope.settings.digestDebounceTime);
                            }
                            getDebounceTime();
                        },
                        clearData: clearResources
                    };
                    getDebounceTime();
                    $scope.watchInfo = {
                        fullListLength: 0,
                        details: [],
                        highlights: {},
                        filtersList: watchMeasureLogFactory.getPreDefiningFilters(),
                        activeFilterList: [],
                        sortByExpressions: []
                    };
                    // ??? NEEL
                    $scope.watchInfo.toggleDisplayTotal = function () {
                        if ($scope.watchInfo.total) {
                            delete $scope.watchInfo.total;
                        } else {
                            $scope.watchInfo.total = watchMeasureLogFactory.mergeAndSumList($scope.watchInfo.details);
                        }
                    };

                    watchMeasureLogFactory.prepareHighlights($scope.watchInfo.highlights);
                    dataNotifierPromise.getNotifyFor(
                        [DATA_NAMES.WATCHERS_FULL_LIST, DATA_NAMES.SORTBY_SORTABLECOLUMN, DATA_NAMES.ACTIVE_FILTERS_LIST], _.throttle(function (data) {
                            var list = data[DATA_NAMES.WATCHERS_FULL_LIST];
                            if (list) {
                                $scope.watchInfo.fullListLength = list.length;
                            } else {
                                list = $scope.watchInfo.details;
                            }
                            list = $filter('birbalSearchBy')(list, $scope.watchInfo.activeFilterList);
                            $scope.watchInfo.details = $filter('orderBy')(list, $scope.watchInfo.sortByExpressions);
                            if ($scope.watchInfo.total) {
                                $scope.watchInfo.total = watchMeasureLogFactory.mergeAndSumList($scope.watchInfo.details);
                            }
                        }, 300));

                    /////////////////////////////////////////////////////////////////////////////////////////
                    //            performance views - digest
                    /////////////////////////////////////////////////////////////////////////////////////////
                    $scope.digestInfo = {
                        fullListLength: 0,
                        highlights: {},
                        details: [],
                        filtersList: digestView.getPreDefiningFilters(),
                        activeFilterList: [],
                        sortByExpressions: ['+startDate']
                    };

                    dataNotifierPromise.getNotifyFor(
                        [DATA_NAMES.DIGEST_GROUP, DATA_NAMES.SORTBY_SORTABLECOLUMN, DATA_NAMES.ACTIVE_FILTERS_LIST], _.throttle(function (data) {
                            var list = data[DATA_NAMES.DIGEST_GROUP];
                            if (list) {
                                $scope.digestInfo.fullListLength = list.length;
                            } else {
                                list = $scope.digestInfo.details;
                            }
                            list = $filter('birbalSearchBy')(list, $scope.digestInfo.activeFilterList);
                            $scope.digestInfo.details = $filter('orderBy')(list, $scope.digestInfo.sortByExpressions);
                        }, 300));

                    var viewChangeListenerRemover = $scope.$on("view-changed", function viewChangeListener(ignore, viewEvent) {
                        if (viewEvent.displayed === "dashboard") {
                            digestView.digestHighlightsWithChart($scope.digestInfo.highlights);
                            viewChangeListenerRemover();
                        }
                    });

                    $scope.clearFilters = function (filterList, activeList) {
                        activeList.length = 0;
                        filterList.forEach(function (item) {
                            item.isActive = false;
                        });
                    };

                    $scope.toggleFilter = function (activeFilterList, item, event) {
                        if (event.target.tagName !== 'INPUT') {
                            if (item.isActive) {
                                var ind = activeFilterList.indexOf(item);
                                if (ind !== -1) {
                                    activeFilterList.splice(ind, 1);
                                }
                                item.isActive = false;
                            } else {
                                activeFilterList.push(item);
                                item.isActive = true;
                            }
                            dataNotifierPromise.notifyChangeFor(DATA_NAMES.ACTIVE_FILTERS_LIST, activeFilterList);
                        }
                    };

                    /////////////////////////////////////////////////////////////////////////////////////////
                    //            slider, filter, dashboard update, sort, configurations
                    /////////////////////////////////////////////////////////////////////////////////////////
                    /* ION SLIDER */
                    //$scope.rangeSlider = {
                    //    digest: {
                    //        config: {
                    //            min: 0,
                    //            max: 200,
                    //            //from: 0,
                    //            //to: 4000,
                    //            type: 'double',
                    //            //step: 1,
                    //            //prefix: "$",
                    //            postfix: " sec",
                    //            prettify: false,
                    //            grid: true
                    //        }
                    //    }
                    //};

                    //$scope.rangeSlider.digest.onChange = function (from, to) {
                    //$scope.selectedDigestRange = digestDataFactory.getDigestHighlightsForRange(from, to);
                    //};

                    // end of controller
                }]);

}(angular, birbalJS));