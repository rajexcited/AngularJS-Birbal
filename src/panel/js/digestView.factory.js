/**
 * Created by Raj on 1/12/2017.
 */
/*global angular, localStorage*/
(function (angular) {
    "use strict";

    angular.module('views.performance.digest', ['measure.digest.app', 'dashboardCharts'])
        .factory('digestView', ['digestMeasureLogFactory', '$interval', '$rootScope', 'dashboardCharts', function (digestMeasureLogFactory, $interval, $rootScope, dashboardCharts) {

            var reset = true;

            function getHighLights(fromStartTime, time) {
                var digestList, len, highlights,
                    digestRuntimeList, domRuntimeList, totalRuntimeDigest, totalRuntimeDom;

                digestList = digestMeasureLogFactory.getMeasuresInRange(fromStartTime);
                len = digestList.length;
                if (len) {
                    digestRuntimeList = [];
                    domRuntimeList = [];
                    totalRuntimeDigest = 0;
                    totalRuntimeDom = 0;

                    _.forEach(digestList, function (d) {
                        // digest
                        totalRuntimeDigest += d.runTime;
                        digestRuntimeList.push(d.runTime);
                        // dom
                        totalRuntimeDom += d.domUpdateTime;
                        domRuntimeList.push(d.domUpdateTime);
                    });

                    /**
                     * rate : in cps/fps - cycles per second using average time - cycles runtime average
                     * longest: longest digest in ms
                     * domLongest: longest dom update - digest effect on DOM update
                     * domAverageTime: in ms changed by digest
                     * lastEndTime: to track
                     *
                     * @type {object} with above properties
                     */
                    highlights = {};
                    // digest
                    highlights.lastEndTime = digestList[len - 1].endTime;
                    highlights.longest = Math.max.apply(Math, digestRuntimeList);
                    // based on average
                    highlights.rate = len * time / totalRuntimeDigest;
                    // dom
                    highlights.domLongest = Math.max.apply(Math, domRuntimeList);
                    highlights.domAverageTime = totalRuntimeDom / len;

                    return highlights;
                }
            }

            function averageCalculatorForhighlight(dataLimit, digestHighlights) {
                var list = [];

                function addToList(highlightOfPolling) {
                    if (!highlightOfPolling) {
                        highlightOfPolling = {
                            rate: 0,
                            longest: digestHighlights.longest,
                            domAverageTime: 0,
                            domLongest: digestHighlights.domLongest,
                            lastEndTime: digestHighlights.lastEndTime
                        };
                    }
                    list.push(highlightOfPolling);
                    if (list.length === 1) {
                        angular.extend(digestHighlights, highlightOfPolling);
                    } else if (list.length > dataLimit) {
                        list.shift();
                    }
                    digestHighlights.lastEndTime = highlightOfPolling.lastEndTime;
                    return highlightOfPolling;
                }

                return function addNAvg(highlightOfPolling) {
                    if (reset) {
                        list.length = 0;
                    }
                    highlightOfPolling = addToList(highlightOfPolling);
                    //if (reset) {
                    // average of prop values
                    var rate = 0, domAverageTime = 0, longest = [], domLongest = [], n = 0;
                    _.forEach(list, function (item) {
                        if (item.rate !== 0) {
                            n++;
                        }
                        rate += item.rate;
                        domAverageTime += item.domAverageTime;
                        longest.push(item.longest || 0);
                        domLongest.push(item.domLongest || 0);
                    });
                    n = n || 1;
                    digestHighlights.rate = rate / n;
                    digestHighlights.domAverageTime = domAverageTime / n;
                    digestHighlights.longest = Math.max.apply(Math, longest);
                    digestHighlights.domLongest = Math.max.apply(Math, domLongest);
                    //}
                    return highlightOfPolling;
                };
            }

            return ({
                getDebounceTime: function () {
                    // default is 200
                    //var settings = localStorage.getItem("settings"),
                    //    debounceTime;
                    //if (!settings) {
                    //    debounceTime = 200;
                    //    localStorage.setItem("settings", JSON.stringify({digestDebounce: debounceTime}));
                    //} else {
                    //    settings = JSON.parse(settings);
                    //    debounceTime = settings.digestDebounce;
                    //}
                    //return debounceTime;
                    return 200;
                },
                updateDebounceTime: function (debounceTime) {
                    var settings = localStorage.getItem("settings");
                    if (!settings) {
                        settings = {};
                    }
                    settings.digestDebounce = debounceTime;
                    localStorage.setItem("settings", JSON.stringify(settings));
                },
                digestHighlightsWithChart: function (digestHighlights) {
                    // monitor by polling
                    var dataLimit = 200, pollTime = 1000, recalculateHighlightAverage;
                    // init chart
                    dashboardCharts.createCharts(dataLimit, 'digest-rate', 'longest-digest', 'dom');
                    recalculateHighlightAverage = averageCalculatorForhighlight(dataLimit, digestHighlights);

                    $interval(function () {
                        if (!$rootScope.csInfo.pause) {
                            var highlightOfPolling;
                            if (reset) {
                                digestHighlights.lastEndTime = 0;
                            }
                            highlightOfPolling = getHighLights(digestHighlights.lastEndTime, pollTime);
                            // modified highlight for chart data
                            highlightOfPolling = recalculateHighlightAverage(highlightOfPolling);
                            dashboardCharts.updateAllCharts(highlightOfPolling, reset);
                            reset = false;
                        }
                    }, pollTime);

                },
                resetView: function () {
                    digestMeasureLogFactory.resetView();
                    reset = true;
                }
            });
        }]);

}(angular));