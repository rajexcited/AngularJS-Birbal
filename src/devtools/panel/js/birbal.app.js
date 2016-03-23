/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    "use strict";

    angular.module('birbal-app', ['background-service-app', 'panel-view-app', 'measure.digest.app', 'birbalFilters.app', 'rangeSlider.app', 'floatThead'])
        .controller('panelViewController',
            ['$scope', 'backgroundService', '$rootScope', 'digestDataFactory', '$interval', function ($scope, backgroundService, $rootScope, digestDataFactory, $interval) {
                // default first message on inspect tab load, letting app know I'm ready
                backgroundService.informBackground(null, 'panelInit', birbalJS.END_POINTS.BACKGROUND);
                $scope.sidebarActions = {};
                $scope.floatHeadEnable = true;
                /////////////////////////////////////////////////////////
                //            panel action listener
                /////////////////////////////////////////////////////////
                /**
                 * @link changeViewActionListener
                 *  @param pageName{string} page name to change view must
                 *  @param ngDetectData {object} angular detection detail to display to user optional
                 */
                function changeViewActionListener(pageName, ngDetectData) {
                    //pageName = (typeof event === 'string') ? event : pageName;
                    if (pageName === 'nbEnable' && $scope.csInfo.enabled) {
                        //if ($scope.view) {
                        //    return;
                        //}
                        pageName = $scope.view || 'dashboard';
                    }

                    //$scope.$applyAsync(function () {
                    $scope.view = pageName;
                    //initializing csInfo for template data for first time or after cleanup
                    angular.extend($scope.csInfo, ngDetectData);
                }

                $rootScope.$on('changePanelView', function (event, pageName, ngDetectData) {
                    $scope.$applyAsync(function () {
                        changeViewActionListener(pageName, ngDetectData);
                    });
                });

                $rootScope.$on('clearResources', function clrRscActionListener(event, panelAction) {
                    // clear app data
                    var isEnabled = !!($scope.csInfo && $scope.csInfo.enabled);
                    $scope.csInfo = $scope.csInfo || {'enabled': isEnabled};
                    $scope.digestExpression = [];
                    if (panelAction === 'removePanel' || panelAction === 'addPanel') {
                        $scope.$applyAsync(function () {
                            $scope.view = '';
                            $scope.csInfo = {
                                'enabled': isEnabled
                            };
                        });
                    }
                    /*else if (panelAction === 'addPanel') {
                     $scope.$apply(function () {
                     $scope.view = '';
                     });
                     }*/

                    //
                    //delete $scope.csInfo;
                    //digestMeasures.length = 0;
                    //$scope.csInfo = {};

                    // qq: why do i need this?
                    // digestMeasuresBox = digestTmplData = undefined;
                    //$scope.$applyAsync(function () {
                    //actionList.enabled = false;
                    //lastMesuredIndex = 0;
                    //$timeout.cancel(timeoutpromise);
                    //timeoutpromise = undefined;
                    //$scope.digestMeasures = new DigestMeasure();
                    //});
                });

                /////////////////////////////////////////////////////////
                //            sidebar actions
                /////////////////////////////////////////////////////////
                $scope.sidebarActions.disableMe = function () {
                    backgroundService.informBackground({doAnalysis: false}, 'doAnalysis', birbalJS.END_POINTS.BACKGROUND);
                    $scope.csInfo.enabled = false;
                    // reload page
                    birbalJS.pageAction('reload');
                };

                $scope.sidebarActions.pauseMyAnalysis = function () {
                    backgroundService.informBackground(null, 'pauseAnalysis');
                };

                $scope.sidebarActions.resumeMyAnalysis = function () {
                    backgroundService.informBackground(null, 'startAnalysis');
                };

                $scope.sidebarActions.changePanelView = changeViewActionListener;
                //$scope.sidebarActions.changePanelView = function (viewName) {
                // qq: when do I need this?
                //if (!actionList.enabled && $scope.csInfo.ngModule && viewName !== 'settings') {
                //    // register/enable/refresh
                //    backgroundService.informBackground({
                //        ngModule: $scope.csInfo.ngModule,
                //        task: 'runAnalysis'
                //    });
                //    actionList.enabled = true;
                //    analyzeDigestMeasures();
                //}
                //changeViewActionListener(viewName);
                //};

                $scope.sidebarActions.enableMe = function () {
                    // register/enable/refresh
                    $scope.csInfo.ngModule = $scope.csInfo.ngModule || $scope.csInfo.ngModuleInput;
                    $scope.csInfo.enabled = true;
                    backgroundService.informBackground({doAnalysis: true}, 'doAnalysis', birbalJS.END_POINTS.BACKGROUND);
                    birbalJS.pageAction('reload');
                };

                /////////////////////////////////////////////////////////
                //            settings view
                /////////////////////////////////////////////////////////
                $scope.settings = {
                    digestDebounce: digestDataFactory.getDigestDebounceTime(),
                    showScopeToElement: false
                };

                $scope.$watch('settings.showScopeToElement', function scopePropSettingsHandler(newval) {
                    var sidebarAction = newval ? 'addScopeToElementPanel' : 'removeScopeToElementPanel';
                    birbalJS.setElementPanelAction(sidebarAction);
                });

                $scope.settings.reloadPage = function () {
                    birbalJS.pageAction('reload');
                };

                /////////////////////////////////////////////////////////
                //            settings view
                /////////////////////////////////////////////////////////
                $interval(function () {
                    $scope.digestCycle = digestDataFactory.getAllDigestMeasures();
                }, 500);

                /* ION SLIDER */
                $scope.rangeSlider = {
                    config: {
                        digest: {
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

                $scope.sortByExpression = function (expression, event) {
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
                        $scope.digestExpression = [];
                    }
                };

                /*
                 // deal this later with panel view
                 $scope.settings.reCalculateMeasures = function () {
                 $timeout.cancel(timeoutpromise);
                 timeoutpromise = undefined;
                 lastMesuredIndex = 0;
                 $scope.digestMeasures.initialize();

                 $scope.$evalAsync(function () {
                 analyzeDigestMeasures();
                 });
                 };
                 */
                // end of controller
            }]);

}(angular, birbalJS));