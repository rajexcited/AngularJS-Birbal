'use strict';

angular.module('ngDependencyGraph')
    .controller('MainCtrl', function ($scope, $rootScope, $timeout, Graph, Const, currentView, inspectedApp, storage, tour) {
        var ctrl = this;
        var lastAppKey;
        var componentsGraph;
        var modulesGraph;

        ctrl.startTour = function () {
            tour.start();
        };

        ctrl.isTourActive = function () {
            return Shepherd.activeTour !== null && Shepherd.activeTour !== undefined;
        };

        // Run this after DOM initialised... post-link directive???
        storage.getTourDone().then(function (done) {
            if (!done) {
                ctrl.startTour();
            }
        });


        function init(isTheSameApp) {
            //ga('send', 'event', 'flow', 'action', 'init ctrl');

            lastAppKey = inspectedApp.getKey();
            var rawData = inspectedApp.getData();

            _.each(rawData.modules, function (module) {
                module.type = 'module';

                _.each(module.components, function (com) {
                    com._module = module;
                });
            });

            var allComponents = [];
            _.each(rawData.modules, function (module) {
                allComponents = allComponents.concat(module.components);
            });

            // Note: if it's the same app, then just update old graph
            componentsGraph = Graph.createFromRawNodes(allComponents, Const.Scope.COMPONENTS, isTheSameApp ? componentsGraph : undefined);
            modulesGraph = Graph.createFromRawNodes(rawData.modules, Const.Scope.MODULES, isTheSameApp ? modulesGraph : undefined);

            /**
             * Connect modules with components
             */
            _.each(componentsGraph.nodes, function (com) {
                var module = _.find(modulesGraph.nodes, {name: com._data._module.name});
                com.module = module;

                module.componentsByType = module.componentsByType || {};
                if (module.componentsByType[com.type] === undefined) {
                    module.componentsByType[com.type] = [];
                }
                module.componentsByType[com.type].push(com);

            });

            currentView.setGraphs(modulesGraph, componentsGraph);

            var appNode = _.find(modulesGraph.nodes, {name: rawData.apps[0]});

            if (isTheSameApp) {
                currentView.applyFilters();
            } else {
                storage.loadCurrentView().then(function () {
                    currentView.chooseNode(appNode);
                    currentView.scope = Const.Scope.COMPONENTS;
                    // TODO meeeh not .setScope here... REFACTOR, setScope should just set scope, not initialise graph
                    currentView.applyFilters();
                }, function () {
                    currentView.chooseNode(appNode);
                    currentView.scope = Const.Scope.COMPONENTS;
                    currentView.applyFilters();
                });
            }
        }

        init(false);

        $scope.$on(Const.Events.INIT_MAIN, function () {
            $rootScope.activeOnly = !!$rootScope.csInfo.enabled;
            if (inspectedApp.getKey() === lastAppKey) {
                init(true);
            } else {
                init(false);
            }
        });

        $scope.change = function () {
            currentView.scope = Const.Scope.COMPONENTS;
        };

        $scope.activeOnlyToggle = function () {
            $rootScope.activeOnly = !$rootScope.activeOnly;
            currentView.applyFilters();
        };

        // TODO this seems architecturaly lame
        $scope.$on(Const.Events.UPDATE_GRAPH, storage.saveCurrentView);
        $scope.$on(Const.Events.CHOOSE_NODE, storage.saveCurrentView);

    });
