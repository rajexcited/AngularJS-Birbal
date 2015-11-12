(function (chrome, birbalJS) {
  'use strict';

  // The function below is executed in the context of the inspected page.
  var updateElementProperties, setDefault;
  var getScopeContents = function () {
    if (window.angular && $0) {
      var scope = window.angular.element($0).scope();
      // Export $scope to the console
      window.$scope = scope;
      return (function (scope) {
        var scopeContents = {
          __private__: {}
        };

        for (var prop in scope) {
          if (scope.hasOwnProperty(prop)) {
            if (prop.substr(0, 2) === '$$') {
              scopeContents.__private__[prop] = scope[prop];
            } else {
              scopeContents[prop] = scope[prop];
            }
          }
        }
        return scopeContents;
      }(scope));
    } else {
      return {};
    }
  };

  // element panel sidebar
  chrome.devtools.panels.elements.createSidebarPane(
    'ng-properties',
    function (sidebar) {
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
    if (_action === 'addSidebar') {
      chrome.devtools.panels.elements.onSelectionChanged.addListener(updateElementProperties);
      updateElementProperties();
    } else if (_action === 'removeSidebar' && setDefault) {
      chrome.devtools.panels.elements.onSelectionChanged.removeListener(updateElementProperties);
      setDefault();
    }
  };

}(chrome, birbalJS));
