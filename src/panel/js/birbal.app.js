/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    "use strict";

    angular.module('birbal-app', ['background-service-app', 'panel-view-app', 'measure.digest.app', 'birbalFilters.app', 'rangeSlider.app', 'searchCriteria.watch.app', 'ngDependencyGraph'])
        .controller('panelViewController',
            ['$scope', 'backgroundService', '$rootScope', 'digestDataFactory', '$interval', function ($scope, backgroundService, $rootScope, digestDataFactory, $interval) {
                // default first message on inspect tab load, letting app know I'm ready
                backgroundService.informBackground(null, 'panelInit');
                $scope.sidebarActions = {};
                /////////////////////////////////////////////////////////
                //            panel action listener
                /////////////////////////////////////////////////////////
                /**
                 * @link changeViewActionListener
                 *  @param pageName{string} page name to change view must
                 *  @param ngDetectData {object} angular detection detail to display to user optional
                 */
                function changeViewActionListener(pageName/*, ngDetectData*/) {
                    //pageName = (typeof event === 'string') ? event : pageName;
                    if (!pageName) {
                        // dashboard or init page
                        if ($rootScope.csInfo.ngDetected) {
                            pageName = 'dashboard';
                        } else {
                            pageName = 'nbEnable';
                        }
                        $rootScope.csInfo.pause = true;
                    }
                    /*if (pageName === 'nbEnable' && $rootScope.csInfo.enabled) {
                     pageName = $scope.view || 'dashboard';
                     } else */
                    if (pageName === 'dependencyGraph') {
                        if (angular.element('.sidebar-collapse').length === 0) {
                            // collapse main header
                            angular.element('.main-header a[data-toggle="offcanvas"]').click();
                        }
                    }
                    $scope.$applyAsync(function () {
                        $scope.view = pageName;
                    });
                    //initializing csInfo for template data for first time or after cleanup
                    //angular.extend($rootScope.csInfo, ngDetectData);
                }

                //$rootScope.$on('changePanelView', function (event, pageName, ngDetectData) {
                //    $scope.$applyAsync(function () {
                //        changeViewActionListener(pageName, ngDetectData);
                //    });
                //});
                $rootScope.$on('ngAppDetails', function (event, ngDetectData) {
                    $scope.$applyAsync(function () {
                        $rootScope.csInfo = ngDetectData;
                        clearResources();
                        changeViewActionListener();
                    });
                });

                $rootScope.$on('performance.resumeAnalysis', function () {
                    $scope.$applyAsync(function () {
                        $rootScope.csInfo.pause = false;
                    });
                });

                function clearResources(/*event, panelAction*/) {
                    // clear app data
                    digestDataFactory.resetDigestMeasures();
                    //var isEnabled = !!($rootScope.csInfo && $rootScope.csInfo.enabled);
                    //$rootScope.csInfo = $rootScope.csInfo || {'enabled': isEnabled};
                    $scope.digestExpression = [];
                    $scope.watchOrderExpression = [];
                    //if (panelAction === 'removePanel' || panelAction === 'addPanel') {

                    //$scope.$applyAsync(function () {
                    //    $scope.view = '';
                    //    $rootScope.csInfo = {
                    //        'enabled': isEnabled,
                    //        'pause': false
                    //    };
                    //});
                    //}
                }

                /////////////////////////////////////////////////////////
                //            sidebar actions
                /////////////////////////////////////////////////////////
                //$scope.sidebarActions.disableMe = function () {
                //    backgroundService.informBackground({doAnalysis: false}, 'doAnalysis', birbalJS.END_POINTS.BACKGROUND);
                //    $rootScope.csInfo.enabled = false;
                //    // reload page
                //    birbalJS.pageAction('reload');
                //};

                $scope.sidebarActions.pauseMyAnalysis = function () {
                    backgroundService.informBackground(null, 'performance.pauseAnalysis');
                    $rootScope.csInfo.pause = true;
                };

                $scope.sidebarActions.resumeMyAnalysis = function () {
                    backgroundService.informBackground(null, 'performance.resumeAnalysis');
                    $rootScope.csInfo.pause = false;
                };

                $scope.sidebarActions.changePanelView = changeViewActionListener;

                //$scope.sidebarActions.enableMe = function () {
                //    // register/enable/refresh
                //    $rootScope.csInfo.ngModule = $rootScope.csInfo.ngModule || $rootScope.csInfo.ngModuleInput;
                //    $rootScope.csInfo.enabled = true;
                //    backgroundService.informBackground({doAnalysis: true}, 'doAnalysis', birbalJS.END_POINTS.BACKGROUND);
                //    birbalJS.pageAction('reload');
                //};

                /////////////////////////////////////////////////////////
                //            settings view
                /////////////////////////////////////////////////////////
                $scope.settings = {
                    digestDebounceTime: digestDataFactory.getDigestDebounceTime()
                    //showScopeToElement: true
                };

                //$scope.settings.exportScopesInElementPanel = function () {
                //    var sidebarAction = $scope.settings.showScopeToElement ? 'addScopeToElementPanel' : 'removeScopeToElementPanel';
                //    birbalJS.setElementPanelAction(sidebarAction);
                //};

                $scope.settings.debounceChanged = function () {
                    if (!$scope.settings.digestDebounceTime || $scope.settings.digestDebounceTime < 0) {
                        $scope.settings.digestDebounceTime = digestDataFactory.getDigestDebounceTime();
                    }
                    digestDataFactory.modifyDigestDebounceTime($scope.digestDebounceTime);
                };

                $scope.settings.clearData = function () {
                    digestDataFactory.resetDigestMeasures();
                };
                //$scope.settings.exportScopesInElementPanel();
                /////////////////////////////////////////////////////////////////////////////////////////
                //            slider, filter, dashboard update, sort, configurations
                /////////////////////////////////////////////////////////////////////////////////////////
                // every second update digest details
                $interval(function () {
                    $scope.digestCycle = digestDataFactory.getAllDigestMeasures();
                    $scope.watchDetails = digestDataFactory.getWatchMeasures();
                }, 1000);

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
                    $scope.selectedDigestRange = digestDataFactory.getDigestHighlightsForRange(from, to);
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