/*global $,angular*/
(function (angular) {
    'use strict';

    angular.module('rangeSlider.app', [])
        .directive('rangeSlider', [function () {

            return {
                restrict: 'AE',
                template: '<div class="col-xs-12"> <input class="ionRangeSlider" type="text" value=""> </div> <div class="col-xs-12"> <span class="sparkline-linechart" style="padding-left: 0.948618%;"></span> </div>',
                scope: {
                    sliderConfig: '=',
                    measures: '=',
                    onRangeChange: '='
                },
                link: function (scope, element) {
                    var $range = element.find('.ionRangeSlider'),
                        defaultSliderConfig = angular.copy(scope.sliderConfig),
                        chartConfig = {chartRangeMinX: 0, chartRangeMaxX: 200, width: "97.9028%"},
                        chartNode = element.find('.sparkline-linechart'),
                        ydata = [];

                    // use for show point on range slider
                    //chartNode.bind('sparklineClick', function (ev) {
                    //    var sparkline = ev.sparklines[0],
                    //        region = sparkline.getCurrentRegionFields();
                    //    console.log("Clicked on x=" + region.x + " y=" + region.y);
                    //});

                    scope.sliderConfig.onFinish = function (data) {
                        // apply filter
                        scope.onRangeChange(data.from, data.to);
                    };
                    $range.ionRangeSlider(scope.sliderConfig);

                    chartConfig.chartRangeMinX = scope.sliderConfig.min;
                    scope.$watch('measures.length', function (len, oldLen) {
                        var ti, mi, m,
                            yl = ydata.length;
                        if (!len && yl) {
                            // clear data
                            scope.sliderConfig = defaultSliderConfig;
                            ydata.length = 0;
                            chartConfig.chartRangeMaxX = 200;
                            chartConfig.chartRangeMinX = 0;
                            return;
                        }
                        if (len === oldLen) {
                            oldLen=0;
                        }
                        // find slider range
                        if (oldLen === 0) {
                            if (scope.sliderConfig.from === undefined) {
                                scope.sliderConfig.from = Math.round(scope.measures[0].startTime / 1000);
                            }
                            // clearData related
                            //scope.sliderConfig.min = Math.max(scope.sliderConfig.from - 2,0);
                            //scope.sliderConfig.max = scope.sliderConfig.min+50;
                        }
                        m = scope.measures[len - 1];
                        if (scope.sliderConfig.max < m.endTime) {
                            scope.sliderConfig.max = Math.round(m.endTime / 1000) + 50;
                        }
                        $range.data("ionRangeSlider").update(scope.sliderConfig);

                        // generate chart data
                        for (mi = oldLen; mi < len; mi++) {
                            m = scope.measures[mi];
                            ti = Math.round(m.startTime / 1000);
                            ydata[ti] = (ydata[ti] || 0) + 1;
                        }
                        // initialize new items as ydata increases depends on ti above. recomputing yl
                        for (ti = yl, yl = ydata.length; ti < yl; ti++) {
                            ydata[ti] = ydata[ti] || null;
                        }
                        ydata[0] = ydata[0] || 0;
                        chartConfig.chartRangeMaxX = scope.sliderConfig.max;
                        chartNode.sparkline(ydata, chartConfig);
                    });
                }
            };
        }]);

}(angular));
