/**
 * Created by Neel on 4/16/2016.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('dependencyTree.app', [])
        .factory('dependencyTree', ['$rootScope', function ($rootScope) {
            var setTree, getTree, addActive, createActiveTree, activeList,
                tree;

            createActiveTree = function () {
                if (tree && activeList) {
                    var list = activeList.join(',') + ',';
                    tree.modules.forEach(function (module) {
                        module.components.forEach(function (c) {
                            if (list.indexOf(':' + c.name + ',') !== -1) {
                                c.isActive = true;
                                module.isActive = true;
                            }
                        });
                    });
                    $rootScope.$broadcast(Const.Events.INIT_MAIN);
                }
                console.log(tree);
            };

            setTree = function (_tree) {
                tree = _tree;
                createActiveTree();
            };

            getTree = function () {
                if (!tree) {
                    return ({
                        apps: [],
                        modules: []
                    });
                }
                return tree;
            };

            addActive = function (_activeList) {
                activeList = _activeList;
                createActiveTree();
            };

            return {
                'setTree': setTree,
                'getTree': getTree,
                'addActive': addActive
            };

        }]);

}(angular));