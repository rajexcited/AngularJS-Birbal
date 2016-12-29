'use strict';

/*jshint -W061 */
angular.module('ngDependencyGraph')
    .factory('inspectedApp', function ($rootScope, dependencyTree) {
        return {
            getKey: function () {
                var tree = dependencyTree.getTree();
                return '' + (tree && tree.apps && tree.apps[0]) + $rootScope.csInfo.enabled;
            },
            getData: function () {
                return dependencyTree.getTree();
            }
        };
    });
