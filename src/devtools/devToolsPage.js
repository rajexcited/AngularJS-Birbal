/*global chrome,console*/
(function (chrome) {
    'use strict';

    console.log('devtoolsPage.js is loading.');

    var getScopeContents = function () {
        if (!window.angular || !$0) {
            return 'Not angular Element';
        }
        var scope = window.angular.element($0).scope();
        // Export $scope to the console
        window.$scope = scope;
        return (function (scope) {
            var props, i,
                scopeContents = {
                    __ngPrivate__: {}
                };

            if (scope) {
                props = Object.keys(scope);
                for (i = 0; i < props.length; i++) {
                    if (props[i].substring(0, 2) === '$$') {
                        scopeContents.__ngPrivate__[props[i]] = scope[props[i]];
                    } else {
                        scopeContents[props[i]] = scope[props[i]];
                    }
                }
            }
            return scopeContents;
        }(scope));
    };

    chrome.devtools.panels.elements.createSidebarPane('ng-properties', function (sidebar) {
        // sidebar property eval
        var updateElementProperties = function () {
            sidebar.setExpression('(' + getScopeContents.toString() + ')()', '$scope');
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