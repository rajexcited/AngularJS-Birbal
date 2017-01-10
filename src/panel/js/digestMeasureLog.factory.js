/**
 * Created by Raj on 1/9/2017.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('measure.digest.app')
        .factory('digestMeasureLogFactory', [function () {

            function computeWatchers(digestMeasure) {
                var watcherList = [],
                    finalWatcherList;

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
                            watcher.scopeFn = watcher.howMany.fn ? [id] : [];
                            watcherList.push(watcher);
                        }
                    }
                    scope.id = id;
                    delete scope.watchers;
                });

                var finalWatcherList = [];
                angular.forEach(_.groupBy(watcherList, function (item) {
                    return item.watch.exp + item.watch.eq;
                }), function (list) {

                    function mergeItems(item1, item2) {
                        item1.scope = item1.scope.concat(item2.scope);
                        item1.scopeFn = item1.scopeFn.concat(item2.scopeFn);
                        item1.watch.howMany.fn += item2.watch.howMany.fn;
                        item1.watch.fn += item2.watch.fn;
                        item1.watch.howMany.get += item2.watch.howMany.get;
                        item1.watch.get += item2.watch.get;
                        return item1;
                    }

                    var item = _.reduce(list, mergeItems);
                    item.scopeFn = _.uniq(item.scopeFn.sort(), true);
                    item.scope = _.uniq(item.scope, true).sort();
                    finalWatcherList.push(item);
                });

                digestMeasure.watchers = finalWatcherList;
                console.log(finalWatcherList);
            }

            return ({
                storeMeasure: function (digestMeasure) {
                    digestMeasure.runTime = digestMeasure.endTime - digestMeasure.startTime;
                    computeWatchers(digestMeasure);
                }
            });
        }]);

}(angular));