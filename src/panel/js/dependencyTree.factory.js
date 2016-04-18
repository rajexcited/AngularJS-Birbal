/**
 * Created by Neel on 4/16/2016.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('dependencyTree.app', ['ngDependencyGraph'])
        .factory('dependencyTree', ['inspectedApp', function (inspectedApp) {
            var setTree, getTree, addActive, tree, activeList,
                findAndMergeDepsToTree;

            findAndMergeDepsToTree = function () {
                if (tree && activeList) {
                    var list = activeList.join(',') + ',';
                    tree.modules.forEach(function (module) {
                        module.components.forEach(function (c) {
                            if (c.deps) {
                                c.deps.forEach(function (dep, i, all) {
                                    if (list.indexOf(':' + dep + ',') !== -1) {
                                        all[i] = {
                                            'name': dep,
                                            'isActive': true
                                        };
                                    }
                                });
                            }
                        });
                    });
                }
            };

            setTree = function (_tree) {
                tree = _tree;
                inspectedApp._setData(tree);
                findAndMergeDepsToTree();
            };

            getTree = function () {
                return tree;
            };

            addActive = function (_activeList) {
                activeList = _activeList;
                findAndMergeDepsToTree();
            };

            return {
                'setTree': setTree,
                'getTree': getTree,
                'addActive': addActive
            };

        }]);

}(angular));