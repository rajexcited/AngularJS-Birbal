/*global chrome,console*/
(function (chrome) {
    'use strict';

    console.log('devtoolsPage.js is loading.');

    var getScopeContents = function (name) {
        if (!window.angular || !$0) {
            return {noAngular: 'Not angular Element'};
        }
        var scope = window.angular.element($0).scope();
        var isolateScope = window.angular.element($0).isolateScope();
        // Export $scope to the console
        window.$scope = scope;
        window.$isolateScope = isolateScope;
        return (function (sc, is) {
            function getScope(scope) {
                var props, i,
                    scopeContents = {
                        __ngPrivate__: {}
                    };

                props = Object.keys(scope);
                for (i = 0; i < props.length; i++) {
                    if (props[i].substring(0, 2) === '$$') {
                        scopeContents.__ngPrivate__[props[i]] = scope[props[i]];
                    } else {
                        scopeContents[props[i]] = scope[props[i]];
                    }
                }
                return scopeContents;
            }

            var ngObj = {noScope: "There is no scope for this element."};
            if (sc) {
                ngObj = {$scope: getScope(sc), $isolateScope: undefined};
            }
            if (is) {
                ngObj.$isolateScope = getScope(is);
            }
            return ngObj;
        }(scope, isolateScope));
    };

    chrome.devtools.panels.elements.createSidebarPane('ng-properties', function (sidebar) {
        // sidebar property eval
        var updateElementProperties = function () {
            sidebar.setExpression('(' + getScopeContents.toString() + ')()');
        };
        updateElementProperties();
        chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementProperties);
    });

    /////////////////////////////////////////////////////////
    //            Create Panel
    /////////////////////////////////////////////////////////
    chrome.devtools.panels.create(
        'Angular Birbal',
        null, // No icon path
        '/src/panel/partials/index.html',
        null // no callback needed
    );

}(chrome));