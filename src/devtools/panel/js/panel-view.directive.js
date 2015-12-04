/*global angular*/
(function (angular) {
    'use strict';

    angular.module('panel-view-app', [])
        .directive('nbPanelView', ['$compile', '$animate', function ($compile, $animate) {
            var viewList = [];
            var newviewTemplate = '<ng-include class="PH_SRC-view" src="\'../partials/PH_SRC.html\'" />';

            return {
                restrict: 'AE',
                link: function (scope, element, attrs) {
                    scope.$watch(attrs.viewName, function (newView, oldView) {
                        if (newView === '') {
                            // cleanup all views
                            element.empty();
                            viewList.length = 0;
                        }
                        else if (newView && viewList.indexOf(newView) === -1) {
                            // first time loading
                            viewList.push(newView);
                            var viewHtml = newviewTemplate.replace(/PH_SRC/g, newView);
                            var viewNode = $compile(angular.element(viewHtml))(scope);
                            $animate.enter(viewNode, element);
                        }
                        // show existing view
                        element.find('ng-include.' + newView + '-view').show();
                        // hide old view if exists any
                        element.find('ng-include.' + oldView + '-view').hide();
                    });
                }
            };
        }]);

}(angular));
