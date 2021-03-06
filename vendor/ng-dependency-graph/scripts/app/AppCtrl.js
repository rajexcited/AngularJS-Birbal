'use strict';

angular.module('ngDependencyGraph')
    .controller('AppCtrl', function ($scope, $rootScope, inspectedApp, Const) {
        var _this = this;

        var templates = {
            MAIN: '/lib/ng-dependency-graph/scripts/main/main.html'
        };

        _this.inspectedApp = inspectedApp;

        function init() {
            var appName = $rootScope.csInfo && $rootScope.csInfo.ngModule;
            // App enabled for this page.
            _this.appName = appName;

            if (_this.appTemplate !== templates.MAIN) {
                _this.appTemplate = templates.MAIN;
            } else {
                $scope.$broadcast(Const.Events.INIT_MAIN);
            }
        }

        init();

    });