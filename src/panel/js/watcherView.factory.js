/**
 * Created by Raj on 1/12/2017.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('views.performance.watch', [])
        .factory('watchMeasureLogFactory', [function () {

            var watcherList = [], watchHighlights, digestCount = 0;

            function updateHighlights(digestWatcherList) {
                var count = 0, dirty = 0;
                digestCount++;
                _.forEach(digestWatcherList, function (w) {
                    count += w.watch.howMany.get;
                    if (w.watch.howMany.fn) {
                        dirty += w.watch.howMany.fn;
                    }
                });
                watchHighlights.max = Math.max(count, watchHighlights.max || 0);
                watchHighlights.dirty = Math.max(dirty, watchHighlights.dirty || 0);
                watchHighlights.avg = ((watchHighlights.avg || 0) * (digestCount - 1) + count) / digestCount;
                return ({
                    list: digestWatcherList,
                    count: count,
                    dirty: dirty,
                    isMax: (watchHighlights.max === count),
                    isDirtyMax: (watchHighlights.dirty === dirty)
                });
            }

            function getUniqueWatchers(watcherList, finalWatcherList) {
                function groupingWatch(item) {
                    return item.watch.exp + item.watch.eq;
                }

                var watchByGroup1 = _.groupBy(watcherList, groupingWatch),
                    watchByGroup2 = _.groupBy(finalWatcherList, groupingWatch);

                function mergeItems(item1, item2) {
                    item1.scope = item1.scope.concat(item2.scope);
                    item1.scopeFn = item1.scopeFn.concat(item2.scopeFn);
                    item1.watch.howMany.fn += item2.watch.howMany.fn;
                    item1.watch.fn += item2.watch.fn;
                    item1.watch.howMany.get += item2.watch.howMany.get;
                    item1.watch.get += item2.watch.get;
                    item1.watch.runTime = item1.watch.get + item1.watch.fn;
                    // remove from watcherList to keep up to date
                    var ind = watcherList.indexOf(item2);
                    if (ind !== -1) {
                        watcherList.splice(ind, 1);
                    }
                    return item1;
                }

                angular.forEach(watchByGroup1, function (list, groupId) {
                    var item = _.reduce(list, mergeItems);
                    item.scopeFn = _.uniq(item.scopeFn).sort();
                    item.scope = _.uniq(item.scope).sort();

                    var itemInGrp2 = watchByGroup2[groupId] && watchByGroup2[groupId][0];
                    if (itemInGrp2) {
                        mergeItems(itemInGrp2, angular.extend({}, item));
                        itemInGrp2.scopeFn = _.uniq(itemInGrp2.scopeFn).sort();
                        itemInGrp2.scope = _.uniq(itemInGrp2.scope).sort();
                    } else {
                        // new one
                        finalWatcherList.push(item);
                    }
                });
            }

            return ({
                addWatchers: function (watchers) {
                    getUniqueWatchers(watchers, watcherList);
                    return updateHighlights(watchers);
                },
                getWatcherList: function () {
                    return watcherList;
                },
                prepareHighlights: function (highlights) {
                    watchHighlights = highlights;
                },
                reset: function () {
                    watcherList.length = 0;
                    digestCount = 0;
                    watchHighlights.max = undefined;
                    watchHighlights.dirty = undefined;
                    watchHighlights.avg = undefined;
                }
            });
        }]);

}(angular));