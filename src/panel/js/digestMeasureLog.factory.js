/**
 * Created by Raj on 1/9/2017.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('measure.digest.app', ['views.performance.watch'])
        .factory('digestMeasureLogFactory', ['$rootScope', 'watchMeasureLogFactory', function ($rootScope, watchMeasureLogFactory) {

            var digestList = [];

            function computeWatchers(digestMeasure) {
                var watcherList = [];

                /**
                 *
                 * @param aWatchExecutionList
                 * @returns {object} has properties :  eq, exp, get, fn, howMany {get, fn}
                 */
                function getWatcher(aWatchExecutionList) {
                    var i, watch,
                        l = aWatchExecutionList.length,
                        computedWatch;

                    computedWatch = angular.copy(aWatchExecutionList[0]);
                    computedWatch.exp = JSON.parse(computedWatch.exp);
                    computedWatch.howMany = {fn: 0, get: 0};
                    if (computedWatch.fn) {
                        computedWatch.howMany.fn++;
                    } else {
                        computedWatch.fn = 0;
                    }

                    for (i = 1; i < l; i++) {
                        watch = aWatchExecutionList[i];
                        if (watch.fn) {
                            computedWatch.fn = computedWatch.fn + watch.fn;
                            computedWatch.howMany.fn++;
                        }
                        computedWatch.get = computedWatch.get.concat(watch.get);
                    }
                    computedWatch.howMany.get = computedWatch.get.length;
                    computedWatch.get = _.reduce(computedWatch.get, function add(num1, num2) {
                        return num1 + num2;
                    });

                    return computedWatch;
                }

                angular.forEach(digestMeasure.scope, function (scope, id) {
                    var i,
                        watcher,
                        len = scope.watchers.length;
                    for (i = 0; i < len; i++) {
                        if (scope.watchers[i]) {
                            watcher = {
                                scope: [id],
                                watch: getWatcher(scope.watchers[i])
                            };
                            watcher.scopeFn = watcher.watch.howMany.fn ? [id] : [];
                            watcherList.push(watcher);
                        }
                    }
                    scope.id = id;
                    delete scope.watchers;
                });

                digestMeasure.watchers = watchMeasureLogFactory.addWatchers(watcherList);
            }

            function getEventNames(digestMeasure) {
                var broadcastEvents = _.groupBy(digestMeasure.events.broadcast, "name");
                var emitEvents = _.groupBy(digestMeasure.events.emit, "name");
                digestMeasure.eventNames = {
                    broadcast: Object.keys(broadcastEvents),
                    emit: Object.keys(emitEvents)
                };
            }

            return ({
                storeMeasure: function (digestMeasure) {
                    digestMeasure.runTime = digestMeasure.endTime - digestMeasure.startTime;
                    computeWatchers(digestMeasure);
                    // apply could be previous or could be current
                    // is there any use of apply? Do I need to display this result ?
                    // apply triggers digest - one apply one digest or error in digest

                    // postDigest
                    if (digestMeasure.postDigestQueue) {
                        digestMeasure.postDigestQueue = JSON.parse(digestMeasure.postDigestQueue);
                    }
                    getEventNames(digestMeasure);
                    digestMeasure.domRenderTime = digestMeasure.domRenderEndTime - digestMeasure.endTime;
                    var lastId = digestList[digestList.length - 1];
                    digestMeasure.id = (lastId && (lastId.id + 1)) || 1;
                    // store last 200
                    digestList.push(digestMeasure);
                    digestList = digestList.slice(-200);
                    birbalJS.logger.info("et= " + digestMeasure.endTime + "  - det= " + digestMeasure.domRenderEndTime + " dr= " + digestMeasure.domRenderTime);
                    $rootScope.$emit("addDigestToDetailGrouping", digestMeasure);
                },
                getAllMeasures: function () {
                    return [].concat(digestList);
                },
                getMeasuresInRange: function (from, to) {
                    // it can be indices or time in ms

                    if (from > 200 && (to > from || to === undefined)) {
                        // by time
                        var fromD = _.find(digestList, function (d) {
                            return (d.startTime >= from);
                        });
                        from = digestList.indexOf(fromD);
                        if (to !== undefined) {
                            var toD = _.findLast(digestList, function (d) {
                                return (d.endTime <= to);
                            });
                            to = digestList.indexOf(toD);
                        }
                    }
                    if (to === undefined) {
                        to = digestList.length;
                    }
                    if (from < 0 || to > 200 || from > to) {
                        from = to;
                    }
                    return digestList.slice(from, to);
                },
                resetView: function () {
                    digestList.length = 0;
                }
            });

        }]);

}(angular));