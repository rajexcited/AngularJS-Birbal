/**
 * Created by Raj on 1/12/2017.
 */
/*global angular, localStorage*/
(function (angular) {
    "use strict";

    angular.module('views.performance.digest', ['measure.digest.app', 'dashboardCharts'])
        .factory('digestView', ['digestMeasureLogFactory', '$interval', '$rootScope', 'dashboardCharts', function (digestMeasureLogFactory, $interval, $rootScope, dashboardCharts) {

            var reset = true, digestGroups = [], debounceTime = 200, TIME_TO_KEEP = 4 * 60 * 1000;

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
                        totalRuntimeDom += d.domRenderTime;
                        domRuntimeList.push(d.domRenderTime);
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

            function averageCalculatorForHighlight(dataLimit, digestHighlights) {
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

            function recalculateGroupHighLight(digestGroup) {
                var last, startTime, endTime, det1, dOfPrevGrp;
                last = digestGroup.list[digestGroup.list.length - 1];
                startTime = digestGroup.list[0].startTime;
                endTime = last.endTime;
                digestGroup.startTime = startTime;
                digestGroup.startDate = new Date(startTime + $rootScope.csInfo.datePerfGapTime);
                digestGroup.duration = endTime - startTime;
                digestGroup.runtime = digestGroup.runtime || 0;
                digestGroup.runtime += last.runTime;

                dOfPrevGrp = digestGroups[digestGroups.length - 2];
                dOfPrevGrp = dOfPrevGrp && dOfPrevGrp.list[dOfPrevGrp.list.length - 1];
                det1 = (dOfPrevGrp && dOfPrevGrp.domRenderEndTime) || 0;
                digestGroup.domRenderTime = 0;
                _.forEach(digestGroup.list, function (d2, i) {
                    var dr1Remaining = det1 - d2.endTime;
                    if (dr1Remaining <= d2.domRenderTime) {
                        if (dr1Remaining < 0) {
                            dr1Remaining = 0;
                        }
                        if (i === 0 && digestGroup.list.length === 1) {
                            birbalJS.logger.log("dom rendering prev time ", "|", d2.domRenderTime, "|", (d2.domRenderTime - dr1Remaining), "|", dr1Remaining, "|");
                        }
                        digestGroup.domRenderTime += (d2.domRenderTime - dr1Remaining);
                        det1 = d2.domRenderEndTime;
                    }
                });
            }

            function removeOlder(lastGrp) {
                // remove 4 min older
                var firstGrp = digestGroups[0];
                if (lastGrp.startTime - firstGrp.endTime >= TIME_TO_KEEP) {
                    digestGroups.shift();
                    removeOlder(lastGrp);
                }
            }

            function addToGroup(digestMeasure) {
                var lastGrp = digestGroups[digestGroups.length - 1];
                var last = lastGrp && lastGrp.list[lastGrp.list.length - 1];

                if (!last || (digestMeasure.startTime - last.endTime > debounceTime)) {
                    // create new group and add
                    lastGrp = {list: []};
                    digestGroups.push(lastGrp);
                }
                // update group list
                lastGrp.list.push(digestMeasure);
                recalculateGroupHighLight(lastGrp);
                removeOlder(lastGrp);
            }

            $rootScope.$on("addDigestToDetailGrouping", function (ignore, measure) {
                addToGroup(measure);
            });

            return ({
                getDebounceTime: function () {
                    var self = this;
                    return new Promise(function (resolve) {
                        // default is 200
                        var key = "digestDebounce";
                        chrome.storage.sync.get(key, function (items) {
                            if (window.isNaN(items[key])) {
                                self.updateDebounceTime(debounceTime);
                                resolve(debounceTime);
                            } else {
                                resolve(items[key]);
                            }
                        });
                    });
                },
                updateDebounceTime: function (debounce) {
                    return new Promise(function (resolve) {
                        debounceTime = debounce;
                        chrome.storage.sync.set({"digestDebounce": debounceTime}, function () {
                            digestGroups = [];
                            _.forEach(digestMeasureLogFactory.getAllMeasures(), addToGroup);
                            resolve();
                        });
                    });
                },
                digestHighlightsWithChart: function (digestHighlights) {
                    // monitor by polling
                    var dataLimit = 200, pollTime = 1000, recalculateHighlightAverage;
                    // init chart
                    dashboardCharts.createCharts(dataLimit, 'digest-rate', 'longest-digest', 'dom');
                    recalculateHighlightAverage = averageCalculatorForHighlight(dataLimit, digestHighlights);

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
                getDigestGroups: function () {
                    return digestGroups;
                },
                resetView: function () {
                    digestMeasureLogFactory.resetView();
                    digestGroups.length = 0;
                    reset = true;
                }
            });
        }]);

}(angular));