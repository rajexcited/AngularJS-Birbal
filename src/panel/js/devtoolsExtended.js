/*global $0,chrome, birbalJS,window*/
(function (chrome, birbalJS) {
    'use strict';

    // The function below is executed in the context of the inspected page.
    var updateElementProperties, setDefault,
        getScopeContents = function () {
            if (!window.angular || !$0) {
                return {};
            }
            var scope = window.angular.element($0).scope();
            // Export $scope to the console
            window.$scope = scope;
            return (function (scope) {
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
            }(scope));
        };

    // element panel sidebar
    chrome.devtools.panels.elements.createSidebarPane('ng-properties', function (sidebar) {
        // sidebar property eval
        updateElementProperties = function () {
            sidebar.setExpression('(' + getScopeContents.toString() + ')()', '$scope');
        };

        setDefault = function () {
            sidebar.setPage('/src/devtools/panel/partials/panelsidebardefault.html');
        };
        // default
        setDefault();
    });

    birbalJS.setElementPanelAction = function (_action) {
        if (_action === 'addScopeToElementPanel') {
            chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementProperties);
            updateElementProperties();
        } else if (_action === 'removeScopeToElementPanel' && setDefault) {
            chrome.devtools.panels.elements.onSelectionChanged.removeListener(updateElementProperties);
            setDefault();
        }
    };

}(chrome, birbalJS));