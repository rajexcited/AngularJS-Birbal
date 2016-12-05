/**
 * Created by Raj on 3/19/2016.
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
            };
        }]);

}(angular));