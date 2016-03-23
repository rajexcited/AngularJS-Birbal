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
        }]);

}(angular));