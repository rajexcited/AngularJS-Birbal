/*global $,angular*/
(function (angular) {
    'use strict';

    angular.module('rangeSlider.app', [])
        .directive('rangeSlider', ['$compile', '$animate', function ($compile, $animate) {

            return {
                restrict: 'AE',
                template: '<div class="col-xs-12"> <input class="ionRangeSlider" type="text" value=""> </div> <div class="col-xs-12"> <span class="sparkline-linechart" style="padding-left: 0.948618%;"></span> </div>',
                scope: {
                    sliderConfig: '=',
                    measures: '='
                },
                link: function (scope, element, attrs) {
                    element.find('.ionRangeSlider').ionRangeSlider(scope.sliderConfig);
                    var slider = element.find('.ionRangeSlider').data("ionRangeSlider"),
                        chartConfig = {chartRangeMinX: 0, chartRangeMaxX: 200, width: "97.9028%"},
                        chartNode = element.find('.sparkline-linechart'),
                        ydata = [];

                    chartConfig.chartRangeMinX = scope.sliderConfig.min;
                    scope.$watch('measures.length', function (len, oldLen) {
                        if (len === oldLen || !len) {
                            return;
                        }
                        var ti, mi, m;

                        // find slider range
                        if (ydata.length === 0) {
                            m = scope.measures[0];
                            if (scope.sliderConfig.from === undefined) {
                                scope.sliderConfig.from = Math.round(m.startTime / 1000);
                            }
                        }
                        m = scope.measures[len - 1];
                        if (scope.sliderConfig.max < m.endTime) {
                            scope.sliderConfig.max = Math.round(m.endTime / 1000) + 50;
                        }
                        slider.update(scope.sliderConfig);

                        // generate chart data
                        for (mi = oldLen; mi < len; mi++) {
                            m = scope.measures[mi];
                            ti = Math.round(m.startTime / 1000);
                            ydata[ti] = (ydata[ti] || 0) + 1;
                        }

                        for (ti = oldLen; ti < len; ti++) {
                            ydata[ti] = ydata[ti] || 0;
                        }
                        chartConfig.chartRangeMaxX = scope.sliderConfig.max;
                        chartNode.sparkline(ydata, chartConfig);
                    });

                }
            };
        }]);

}(angular));
