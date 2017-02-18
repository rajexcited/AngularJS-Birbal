/*global angular*/
(function (angular) {
    "use strict";

    angular.module('dataNotifier.promise.factory', [])
        .constant('DATA_NAMES', {
            'WATCHERS_FULL_LIST': 'watcher-list',
            'DIGEST_GROUP': 'digest-group-list',
            'ACTIVE_FILTERS_LIST': 'active-filters-list',
            'DIGEST_GROUP_DETAIL_TOGGLE': 'digest-group-detail-toggle',
            'SORTBY_SORTABLECOLUMN': 'sortable-column-sortBy'
        })
        .factory('dataNotifierPromise', ['$q', '$rootScope', function ($q, $rootScope) {

            var defers = {};

            function getDefer(name) {
                if (!defers[name]) {
                    defers[name] = $q.defer();
                }
                return defers[name];
            }

            function getPromise(names) {

                function getPromiseNameValue(name) {
                    function notifierValue(v) {
                        var obj = {};
                        obj[this] = v;
                        return obj;
                    }

                    return getDefer(name).promise
                        .then(undefined, undefined, notifierValue.bind(name));
                }

                var defer = $q.defer();

                if (names.length === 1) {
                    return getPromiseNameValue(names[0]);
                }
                angular.forEach(names, function (name) {
                    getPromiseNameValue(name).then(undefined, undefined, function (v) {
                        defer.notify(v);
                    });
                });

                return defer.promise;
            }

            return {
                notifyChangeFor: function (dataName, value) {
                    $rootScope.$evalAsync(function () {
                        getDefer(dataName).notify(value);
                    });
                },
                getNotifyFor: function (dataNames, notifyCallback) {
                    getPromise([].concat(dataNames)).then(null, null, notifyCallback);
                }
            };

        }]);

}(angular));