'use strict';

/*jshint -W061 */
angular.module('ngDependencyGraph')
    .factory('inspectedApp', function () {

        var _data;

        var service = {
            waitingForAppData: false,
            getKey: function () {
                return this.apps && this.apps[0];
            },
            _setData: function (data) {
                _data = data;
                this.apps = _data.apps;
            },
            getData: function () {
                return _data;
            }
        };

        return service;
    });
