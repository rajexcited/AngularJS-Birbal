(function (angular) {
  'use strict';

  angular.module('panel-view-app', [])
    .directive('nbPanelView', ['$compile', '$animate', function ($compile, $animate) {
      var viewList = [];
      var newviewTemplate = '<ng-include class="PH_SRC-view" src="\'../partials/PH_SRC.html\'" />';

      return {
        retrict: 'AE',
        template: '<div></div>',
        // replace: true,
        link: function (scope, element, attrs) {
          scope.$watch(attrs.viewName, function (newView, oldView) {
            if (viewList.indexOf(newView) !== -1) {
              // show existing view
              element.find('ng-include.' + newView + '-view').show();
            } else if (newView) {
              // first time loading
              viewList.push(newView);
              var viewHtml = newviewTemplate.replace(/PH_SRC/g, newView);
              var viewNode = $compile(angular.element(viewHtml))(scope);
              $animate.enter(viewNode, element);
              // element.append(viewNode);
            } else if (newView === '') {
              // cleanup resources
              $(element).empty();
              viewList.length = 0;
            }
            if (viewList.indexOf(oldView) !== -1) {
              element.find('ng-include.' + oldView + '-view').hide();
            }
          });
        }
      };
    }]);

}(angular));
