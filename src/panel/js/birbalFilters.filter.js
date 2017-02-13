/**
 * Created by Neel on 3/19/2016.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('birbalFilters.app', [])
        .filter('percentage', ['$filter', function ($filter) {
            return function (part, whole) {
                return $filter('number')(part * 100 / whole, 2) + ' %';
            };
        }])
        .filter('range', [function () {
            // id:array length + from + to
            var listRef = {};
            return function (list, id, from, to) {
                if (list) {
                    var len = list.length;
                    from = from || 0;
                    to = to === undefined ? len : to;
                    var withinRange = len >= to && len <= from,
                        refId = withinRange + '$' + from + '$' + to;
                    if (!listRef[id] || listRef[id].refId !== refId) {
                        listRef[id] = {
                            'refId': refId,
                            'list': list.slice(from, to + 1)
                        };
                    }
                    return listRef[id].list;
                }
                return [];
            };
        }])
        .filter('birbalSearchBy', [function () {
            return function (list, conditionList) {
                var len = conditionList.length,
                    filteredList = list;
                if (list && len) {
                    filteredList = [];
                    angular.forEach(list, function (item) {
                        var i,
                            shouldAdd = true;
                        for (i = 0; i < len && shouldAdd; i++) {
                            shouldAdd = conditionList[i].checkCondition(item);
                        }
                        if (shouldAdd) {
                            filteredList.push(item);
                        }
                    });
                }
                return filteredList;
            };
        }]);

}(angular));