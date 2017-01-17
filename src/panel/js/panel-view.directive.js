/*global $,angular*/
(function (angular) {
    'use strict';

    angular.module('panel-view-app', [])
        .directive('nbPanelView', ['$compile', '$animate', '$rootScope', '$timeout', function ($compile, $animate, $rootScope, $timeout) {
            var defaultHtml,
                viewList = [],
                newviewTemplate = '<ng-include class="PH_SRC-view" src="\'../partials/PH_SRC.html\'" />';

            return {
                restrict: 'AE',
                link: function (scope, element, attrs) {
                    scope.$watch(attrs.viewName, function (newView, oldView) {
                        function triggerViewChangeEvent() {
                            // 100 ms to allow DOM to render view
                            $timeout(function () {
                                $rootScope.$broadcast("view-changed", {displayed: newView, hidden: oldView});
                            }, 100);
                        }

                        if (newView === '') {
                            // cleanup all views
                            if (defaultHtml) {
                                element.html(defaultHtml);
                            } else {
                                defaultHtml = element.html();
                                element.empty();
                            }
                            viewList.length = 0;
                        } else if (newView && viewList.indexOf(newView) === -1) {
                            // first time loading
                            if (!viewList.length) {
                                // no view loaded
                                defaultHtml = defaultHtml || element.html();
                                element.empty();
                            }
                            viewList.push(newView);
                            var viewHtml = newviewTemplate.replace(/PH_SRC/g, newView);
                            var viewNode = $compile(angular.element(viewHtml))(scope);
                            $animate.enter(viewNode, element);
                        }
                        // side bar item
                        $('li[select-view]').removeClass('active');
                        $('li[select-view="' + newView + '"]').addClass('active');

                        // show existing view
                        element.find('ng-include.' + newView + '-view').show();
                        // hide old view if exists any
                        element.find('ng-include.' + oldView + '-view').hide();
                        triggerViewChangeEvent();
                    });
                }
            };
        }]);

}(angular));
