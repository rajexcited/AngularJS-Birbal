/*global angular, birbalJS, $*/
(function (angular, birbalJS) {
    "use strict";

    angular.module('birbal-app', ['background-service-app', 'panel-view-app', 'views.performance.digest', 'birbalFilters.app', 'rangeSlider.app', 'searchCriteria.watch.app', 'ngDependencyGraph', 'measure.digest.app', 'sortable-column.component'])
        .controller('panelViewController',
            ['$scope', 'backgroundService', '$rootScope', 'digestView', '$interval', 'watchMeasureLogFactory', '$timeout', function ($scope, backgroundService, $rootScope, digestView, $interval, watchMeasureLogFactory, $timeout) {
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
                            digestView.updateDebounceTime($scope.settings.digestDebounceTime).then(function () {
                                $scope.digestInfo.details = digestView.getDigestGroups();
                            });
                        }
                        getDebounceTime();
                        birbalJS.logger.log("debounce changed, digest groups ", digestView.getDigestGroups());
                    },
                    clearData: function () {
                        digestView.resetView();
                        watchMeasureLogFactory.reset();
                        //digestDataFactory.resetDigestMeasures();
                    }
                };
                getDebounceTime();
                $scope.watchInfo = {
                    details: watchMeasureLogFactory.getWatcherList(),
                    highlights: {},
                    activeFilterList: [],
                    sortByExpressions: []
                };
                watchMeasureLogFactory.prepareHighlights($scope.watchInfo.highlights);
                birbalJS.logger.log(" digest groups ", digestView.getDigestGroups());
                $scope.watchInfo.filtersList = [
                    {
                        label: 'Hide unused watchers',
                        checkCondition: function (watcher) {
                            return watcher.watch.howMany.fn > 0;
                        },
                        isActive: false
                    },
                    {
                        label: 'Display unused watchers',
                        checkCondition: function (watcher) {
                            return watcher.watch.howMany.fn === 0;
                        },
                        isActive: false
                    },
                    {
                        label: 'Display watchers without filter',
                        checkCondition: function (watcher) {
                            var regExForPipe = /\w\s*\|\s*\w/;
                            return !regExForPipe.test(watcher.watch.exp);
                        },
                        isActive: false
                    },
                    {
                        label: 'Display watchers using only filter',
                        checkCondition: function (watcher) {
                            var regExForPipe = /\w\s*\|\s*\w/;
                            return regExForPipe.test(watcher.watch.exp);
                        },
                        isActive: false
                    },
                    {
                        label: 'Search Expression: ',
                        input: {
                            type: 'text',
                            placeholder: 'Enter Expression to search and select it',
                            value: ''
                        },
                        checkCondition: function (watcher) {
                            return watcher.watch.exp.search(new RegExp(this.input.value, 'i')) !== -1;
                        },
                        isActive: false
                    }
                ];

                /////////////////////////////////////////////////////////////////////////////////////////
                //            performance views - digest
                /////////////////////////////////////////////////////////////////////////////////////////
                $scope.digestInfo = {
                    highlights: {},
                    details: digestView.getDigestGroups(),
                    activeFilterList: [],
                    sortByExpressions: ['+startDate']
                };
                $scope.digestInfo.filtersList = [
                    {
                        label: 'Show me cycles within last given seconds',
                        input: {
                            type: 'number',
                            placeholder: 'Enter seconds',
                            value: ''
                        },
                        checkCondition: function (group) {
                            return group.startDate >= new Date(Date.now() - parseInt(this.input.value) * 1000);
                        },
                        isActive: false
                    },
                    {
                        label: 'Display group having 1 or 2 cycles',
                        checkCondition: function (group) {
                            return group.list.length <= 2;
                        },
                        isActive: false
                    },
                    {
                        label: 'Hide group having 1 or 2 cycles',
                        checkCondition: function (group) {
                            return group.list.length > 2;
                        },
                        isActive: false
                    },
                    {
                        label: 'Display groups consumed by watchers for more than 65% time',
                        tooltipTitle: 'tells us which cycles and DOM time consumed by watchers',
                        checkCondition: function (group) {
                            return (group.watcherRunTime / group.runTime) >= 0.65;
                        },
                        isActive: false
                    }
                ];

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
                    }
                };


                //////////////////////////////////////////////////////////////////////////////////////////
                //          handle scroll bar
                //////////////////////////////////////////////////////////////////////////////////////////
                (function handleScrollBarGap() {
                    var prevScrollbarGap,
                        contentWrapper = $(".wrapper .content-wrapper"),
                        $$document = $(document),
                        $$window = $(window),
                        $$HTMLBODY = $('html,body'),
                        SCROLL_BAR_SPACE = '17px',
                        NO_SPACE = '';


                    function isThereScrollBar() {
                        return ($$document.height() > $$window.height());
                    }

                    function changeScrollbarPadding(addPadding) {
                        if (addPadding && prevScrollbarGap !== SCROLL_BAR_SPACE) {
                            prevScrollbarGap = SCROLL_BAR_SPACE;
                            contentWrapper.css('padding-right', prevScrollbarGap);
                            $timeout(function () {
                                $$HTMLBODY.css('overflow-y', 'hidden');
                            }, 150);
                        } else if (!addPadding && prevScrollbarGap !== NO_SPACE) {
                            prevScrollbarGap = NO_SPACE;
                            contentWrapper.css('padding-right', prevScrollbarGap);
                            $timeout(function () {
                                $$HTMLBODY.css('overflow-y', '');
                            }, 150);
                        }
                    }

                    $interval(function () {
                        // yes - remove right scrollbar space
                        // no - add right scrollbar space
                        changeScrollbarPadding(!isThereScrollBar());
                    }, 400);

                })();

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

                //$scope.digestSortByExpression = function (expression, event) {
                //    if (expression && event) {
                //        // get index of expression, ignore predicate
                //        var sortClass = 'fa-sort-asc',
                //            exp = '+' + expression,
                //            ind = $scope.digestExpression.indexOf('+' + expression),
                //            irev = $scope.digestExpression.indexOf('-' + expression);
                //
                //        if (ind !== -1) {
                //            // toggle predicate
                //            exp = '-' + expression;
                //            sortClass = 'fa-sort-desc';
                //            $scope.digestExpression.splice(ind, 1);
                //        } else if (irev !== -1) {
                //            // toggle predicate
                //            sortClass = 'fa-sort-asc';
                //            $scope.digestExpression.splice(irev, 1);
                //        }
                //        // give this exp to sort order first priority
                //        $scope.digestExpression.unshift(exp);
                //        event.currentTarget.querySelector('i.fa.fa-fw').className = "fa fa-fw " + sortClass;
                //    } else {
                //        $('#digestCycleDataTable').find('thead i.fa.fa-fw').removeClass('fa-sort-asc fa-sort-desc').addClass('fa-unsorted');
                //        $scope.digestExpression.length = 0;
                //    }
                //};

                //$scope.watchSortByExpression = function (expression, event) {
                //    $('#watchersDataTable').find('thead i.fa.fa-fw').removeClass('fa-sort-asc fa-sort-desc').addClass('fa-unsorted');
                //    if (expression && event) {
                //        // get index of expression, ignore predicate
                //        var sortClass = 'fa-sort-asc',
                //            expAsc = '+' + expression;
                //
                //        if ($scope.watchOrderExpression[0] === expAsc) {
                //            $scope.watchOrderExpression[0] = '-' + expression;
                //            sortClass = 'fa-sort-desc';
                //        } else {
                //            $scope.watchOrderExpression[0] = expAsc;
                //        }
                //        event.currentTarget.querySelector('i.fa.fa-fw').className = "fa fa-fw " + sortClass;
                //    } else {
                //        $scope.watchOrderExpression.length = 0;
                //    }
                //};

                // end of controller
            }]);

}(angular, birbalJS));