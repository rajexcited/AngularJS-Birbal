/**
 * Created by Neel on 4/16/2016.
 */
/*global angular*/
(function (angular) {
    "use strict";

    angular.module('dependencyTree.app', [])
        .factory('dependencyTree', ['$rootScope', 'Const', function ($rootScope, Const) {
            var setTree, getTree, addActive, createActiveTree,
                activeList, tree;

            createActiveTree = function () {
                if (tree && activeList) {
                    var list = activeList.join(',') + ',',
                        report = [[], []];
                    tree.modules.forEach(function (module) {
                        module.components.forEach(function (c) {
                            var name = c.name;
                            switch (c.type) {
                                case 'directive':
                                    name = name + 'Directive';
                                    break;
                                case 'filter':
                                    name = name + 'Filter';
                                    break;
                                default:
                            }
                            var ind = list.indexOf(':' + name + ',');
                            if (ind !== -1) {
                                c.isActive = true;
                                module.isActive = true;
                                report[0].push(c.type + ':' + c.name);
                                list = list.substr(0, ind) + '`' + list.substr(ind);
                            } else if (list.indexOf(name) === -1) {
                                report[1].push(c.type + ':' + c.name);
                            }
                        });
                    });
                }
                $rootScope.$broadcast(Const.Events.INIT_MAIN);
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