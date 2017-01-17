/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    "use strict";

    angular.module('birbal-app', ['background-service-app', 'panel-view-app', 'views.performance.digest', 'birbalFilters.app', 'rangeSlider.app', 'searchCriteria.watch.app', 'ngDependencyGraph'])
        .controller('panelViewController',
            ['$scope', 'backgroundService', '$rootScope', 'digestView', '$interval', function ($scope, backgroundService, $rootScope, digestView, $interval) {
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
                    if (pageName === 'dependencyGraph') {
                        if (angular.element('.sidebar-collapse').length === 0) {
                            // collapse main header
                            angular.element('.main-header a[data-toggle="offcanvas"]').click();
                        }
                    }
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
                    //digestDataFactory.resetDigestMeasures();
                    $scope.digestExpression = [];
                    $scope.watchOrderExpression = [];

                    digestView.resetView();
                    //$scope.digestInfo.highlights = {};
                    //$scope.digestInfo.details = {};
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
                $scope.settings = {
                    digestDebounceTime: digestView.getDebounceTime(),
                    debounceChanged: function () {
                        if (!$scope.settings.digestDebounceTime || $scope.settings.digestDebounceTime < 0) {
                            $scope.$applyAsync(function () {
                                $scope.settings.digestDebounceTime = digestView.getDebounceTime();
                            });
                            //$scope.settings.digestDebounceTime = digestDataFactory.getDigestDebounceTime();
                        } else {
                            digestView.updateDebounceTime($scope.settings.digestDebounceTime);
                        }
                        /*digestDataFactory.modifyDigestDebounceTime($scope.digestDebounceTime);*/
                    },
                    clearData: function () {
                        digestView.resetView();
                        //digestDataFactory.resetDigestMeasures();
                    }
                };

                /////////////////////////////////////////////////////////////////////////////////////////
                //            performance views - digest
                /////////////////////////////////////////////////////////////////////////////////////////
                $scope.digestInfo = {highlights: {}, details: {}};
                var viewChangeListenerRemover = $scope.$on("view-changed", function viewChangeListener(ignore, viewEvent) {
                    if (viewEvent.displayed === "dashboard") {
                        digestView.digestHighlightsWithChart($scope.digestInfo.highlights);
                        viewChangeListenerRemover();
                    }
                });

                //window.onload = function () {
                //    var chart = new CanvasJS.Chart("chartContainer",
                //        {
                //            theme: "theme2",
                //            title: {
                //                text: "Digest"
                //            },
                //            axisY: {
                //                includeZero: false,
                //                valueFormatString: "#,###",
                //                suffix: "ms"
                //            },
                //            toolTip: {
                //                shared: "true"
                //            },
                //            data: [
                //                {
                //                    type: "spline",
                //                    showInLegend: true,
                //                    name: "mentions of samsung",
                //                    markerSize: 0,
                //                    color: "#C0504E",
                //                    dataPoints: [
                //                        {label: "Ep. 1", y: 3640000},
                //                        {label: "Ep. 2", y: 3640000},
                //                        {label: "Ep. 3", y: 3640000},
                //                        {label: "Ep. 4", y: 3640000},
                //                        {label: "Ep. 5", y: 3640000},
                //                        {label: "Ep. 6", y: 3640000},
                //                        {label: "Ep. 7", y: 3640000},
                //                        {label: "Ep. 8", y: 3640000},
                //                        {label: "Ep. 9", y: 3640000},
                //                        {label: "Ep. 10", y: 3640000}
                //
                //                    ]
                //                },
                //
                //                {
                //                    type: "spline",
                //                    showInLegend: true,
                //                    name: "Season 2",
                //                    // markerSize: 0,
                //                    color: "#369EAD",
                //                    dataPoints: [
                //                        {label: "Ep. 1", y: 3858000},
                //                        {label: "Ep. 2", y: 3759000},
                //                        {label: "Ep. 3", y: 3766000},
                //                        {label: "Ep. 4", y: 3654000},
                //                        {label: "Ep. 5", y: 3903000},
                //                        {label: "Ep. 6", y: 3879000},
                //                        {label: "Ep. 7", y: 3694000},
                //                        {label: "Ep. 8", y: 3864000},
                //                        {label: "Ep. 9", y: 3384000},
                //                        {label: "Ep. 10", y: 4200000}
                //
                //                    ]
                //                }
                //
                //
                //            ],
                //            legend: {
                //                cursor: "pointer",
                //                itemclick: function (e) {
                //                    if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                //                        e.dataSeries.visible = false;
                //                    }
                //                    else {
                //                        e.dataSeries.visible = true;
                //                    }
                //                    chart.render();
                //                }
                //
                //            },
                //        });
                //
                //    chart.render();
                //}


                //$interval(function () {
                //    $scope.highlights.digest = digestView.getHighlights();
                //$scope.digestCycle = digestDataFactory.getAllDigestMeasures();
                //$scope.watchDetails = digestDataFactory.getWatchMeasures();
                //}, 1000);


                /////////////////////////////////////////////////////////////////////////////////////////
                //            slider, filter, dashboard update, sort, configurations
                /////////////////////////////////////////////////////////////////////////////////////////
                // every second update digest details
                //$interval(function () {
                //$scope.digestCycle = digestDataFactory.getAllDigestMeasures();
                //$scope.watchDetails = digestDataFactory.getWatchMeasures();
                //}, 1000);

                /* ION SLIDER */
                $scope.rangeSlider = {
                    digest: {
                        config: {
                            min: 0,
                            max: 200,
                            //from: 0,
                            //to: 4000,
                            type: 'double',
                            //step: 1,
                            //prefix: "$",
                            postfix: " sec",
                            prettify: false,
                            grid: true
                        }
                    }
                };

                $scope.rangeSlider.digest.onChange = function (from, to) {
                    //$scope.selectedDigestRange = digestDataFactory.getDigestHighlightsForRange(from, to);
                };

                $scope.digestSortByExpression = function (expression, event) {
                    if (expression && event) {
                        // get index of expression, ignore predicate
                        var sortClass = 'fa-sort-asc',
                            exp = '+' + expression,
                            ind = $scope.digestExpression.indexOf('+' + expression),
                            irev = $scope.digestExpression.indexOf('-' + expression);

                        if (ind !== -1) {
                            // toggle predicate
                            exp = '-' + expression;
                            sortClass = 'fa-sort-desc';
                            $scope.digestExpression.splice(ind, 1);
                        } else if (irev !== -1) {
                            // toggle predicate
                            sortClass = 'fa-sort-asc';
                            $scope.digestExpression.splice(irev, 1);
                        }
                        // give this exp to sort order first priority
                        $scope.digestExpression.unshift(exp);
                        event.currentTarget.querySelector('i.fa.fa-fw').className = "fa fa-fw " + sortClass;
                    } else {
                        $('#digestCycleDataTable').find('thead i.fa.fa-fw').removeClass('fa-sort-asc fa-sort-desc').addClass('fa-unsorted');
                        $scope.digestExpression.length = 0;
                    }
                };

                $scope.watchSortByExpression = function (expression, event) {
                    $('#watchersDataTable').find('thead i.fa.fa-fw').removeClass('fa-sort-asc fa-sort-desc').addClass('fa-unsorted');
                    if (expression && event) {
                        // get index of expression, ignore predicate
                        var sortClass = 'fa-sort-asc',
                            expAsc = '+' + expression;

                        if ($scope.watchOrderExpression[0] === expAsc) {
                            $scope.watchOrderExpression[0] = '-' + expression;
                            sortClass = 'fa-sort-desc';
                        } else {
                            $scope.watchOrderExpression[0] = expAsc;
                        }
                        event.currentTarget.querySelector('i.fa.fa-fw').className = "fa fa-fw " + sortClass;
                    } else {
                        $scope.watchOrderExpression.length = 0;
                    }
                };

                // end of controller
            }]);

}(angular, birbalJS));