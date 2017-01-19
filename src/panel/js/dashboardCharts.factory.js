/**
 * Created by Raj on 1/12/2017.
 */
/*global angular, localStorage*/
(function (angular) {
    "use strict";

    angular.module('dashboardCharts', [])
        .factory('dashboardCharts', ['$timeout', function ($timeout) {

            var charts = {
                created: []
            };

            /**
             * emphasize by distance
             * @param ind added index in data points list
             * @param datapoints
             * @param yMax max y allowed
             */
            function emphasizeDataPointMarker(ind, datapoints, yMax) {
                // gold - current, silver - prev, bronze - last second
                var goldPoint, silverPoint, bronzePoint, size;

                function sizePoint(point, size) {
                    if (yMax && point.y === yMax) {
                        point.markerSize = 6;
                    } else {
                        point.markerSize = size;
                    }
                }

                if (isNaN(ind)) {
                    // not an index - but point
                    ind = datapoints.indexOf(ind);
                }

                goldPoint = datapoints[ind];
                // fail safe
                silverPoint = datapoints[ind - 1] || {y: null};
                bronzePoint = datapoints[ind - 2] || {y: null};

                if (goldPoint.y !== null) {
                    size = 4;
                    if (silverPoint.y !== null) {
                        size = 2;
                        if (bronzePoint.y !== null) {
                            size = 1;
                            sizePoint(bronzePoint, size);
                        }
                        sizePoint(silverPoint, size);
                    }
                    sizePoint(goldPoint, size);
                }
                return goldPoint;
            }

            function initChartData(chartOptions, ind) {
                var i,
                    dateTime = Date.now(),
                    dataPoints = chartOptions.data[ind].dataPoints,
                    limit = chartOptions.data[ind].max;

                dataPoints.length = 0;
                for (i = 0; i < limit; i++) {
                    dataPoints.push({x: new Date(dateTime - (limit - i) * 1000), y: null});
                }
                chartOptions.data[ind].maxYOccurance = 0;
                if (chartOptions.axisY.maximum) {
                    chartOptions.axisY.interval = Math.ceil(chartOptions.axisY.maximum / 3);
                }
            }

            function addUpdateDataPoint(chartOptions, ind, shouldNullifyYInterval) {
                var point, dataPoints, n;

                dataPoints = chartOptions.data[ind].dataPoints;
                n = ++chartOptions.data[ind].nModified;
                point = {x: new Date(), y: null};
                if (!dataPoints[n]) {
                    var first = dataPoints.shift();
                    if (chartOptions.data[ind].maxYOccurance && first.yVal && chartOptions.axisY.maximum && first.yVal > chartOptions.axisY.maximum) {
                        chartOptions.data[ind].maxYOccurance--;
                    }
                    dataPoints.push(point);
                } else {
                    dataPoints[n] = point;
                }
                //point.xmin = Math.floor(point.x / 60);
                //point.xsec = (point.x % 60);
                if (shouldNullifyYInterval && chartOptions.axisY.interval !== null) {
                    chartOptions.axisY.interval = null;
                }
                return point;
            }

            function updatePointYVal(p, max, dataSeries) {
                if (p.yVal) {
                    p.y = p.yVal;
                    if (max && p.yVal > max) {
                        if (dataSeries) {
                            dataSeries.maxYOccurance++;
                        }
                        p.y = max;
                    }
                }
            }

            charts['digest-rate'] = function (id, limit) {
                // digest rate
                var chart, chartOptions;

                chartOptions = {
                    theme: "theme1",
                    title: {
                        text: "Digest Rate"
                    },
                    axisY: {
                        title: "cycles per sec (CPS)",
                        valueFormatString: "#,###",
                        connectNullData: true,
                        gridThickness: 0.3,
                        includeZero: true,
                        maximum: 70
                    },
                    axisX: {
                        title: " time (military date time) ",
                        includeZero: false,
                        valueFormatString: "HH:mm:ss"
                    },
                    toolTip: {
                        enabled: true,
                        shared: true
                    },
                    data: [{
                        name: "rate ",
                        type: "spline",
                        color: "#C0504E",
                        xValueFormatString: "HH:mm:ss",
                        toolTipContent: "{name} :  {yVal} cps <br/>  @ {x} ",
                        highlightEnabled: true,
                        nModified: -1,
                        max: limit,
                        dataPoints: []
                    }]
                };

                this.update = function (highlightInfo, reset) {
                    var axisY, point;
                    if (reset) {
                        initChartData(chartOptions, 0);
                    }

                    point = addUpdateDataPoint(chartOptions, 0, !!(highlightInfo && highlightInfo.rate));

                    axisY = chartOptions.axisY;
                    if (highlightInfo && highlightInfo.rate) {
                        point.yVal = Math.ceil(highlightInfo.rate);
                        updatePointYVal(point, axisY.maximum);
                    }
                    emphasizeDataPointMarker(point, chartOptions.data[0].dataPoints, axisY.maximum);

                    chart.render();
                };

                chart = new CanvasJS.Chart(id, chartOptions);

                this.update(null, true);
            };

            charts['longest-digest'] = function (id, limit) {
                // digest rate
                var chart, chartOptions;

                chartOptions = {
                    theme: "theme1",
                    title: {
                        text: "Longest Digest cycle with benchmark"
                    },
                    axisY: {
                        title: "digest longest time (ms)",
                        valueFormatString: "#,###",
                        connectNullData: true,
                        gridThickness: 0.3,
                        includeZero: false,
                        suffix: " ms"
                    },
                    axisX: {
                        title: " time (military time) ",
                        includeZero: false,
                        valueFormatString: "HH:mm:ss"
                    },
                    toolTip: {
                        enabled: true,
                        shared: true
                    },
                    data: [{
                        name: "longest digest time",
                        type: "spline",
                        color: "#C0504E",
                        xValueFormatString: "HH:mm:ss",
                        toolTipContent: "{name} :  {yVal} ms <br/>  @ {x} ",
                        highlightEnabled: true,
                        nModified: -1,
                        max: limit,
                        dataPoints: []
                    }]
                };

                this.update = function (highlightInfo, reset) {
                    var axisY, point;
                    if (reset) {
                        initChartData(chartOptions, 0);
                    }

                    point = addUpdateDataPoint(chartOptions, 0, !!(highlightInfo && highlightInfo.longest));

                    axisY = chartOptions.axisY;
                    if (highlightInfo && highlightInfo.longest) {
                        point.y = point.yVal = Math.ceil(highlightInfo.longest);
                    }

                    emphasizeDataPointMarker(point, chartOptions.data[0].dataPoints, axisY.maximum);
                    chart.render();
                };

                chart = new CanvasJS.Chart(id, chartOptions);

                this.update(null, true);
            };

            charts['dom'] = function (id, limit) {
                // digest rate
                var chart, chartOptions,
                    LONGEST_DS = 1, AVG_DS = 0;

                chartOptions = {
                    theme: "theme1",
                    title: {
                        text: "DOM rendering due to digest"
                    },
                    axisY: {
                        title: "rendering time (ms)",
                        valueFormatString: "#,###",
                        connectNullData: true,
                        gridThickness: 0.3,
                        includeZero: false,
                        suffix: " ms",
                        maximum: 1200
                    },
                    axisX: {
                        title: " time (military time) ",
                        includeZero: false,
                        valueFormatString: "HH:mm:ss"
                    },
                    toolTip: {
                        enabled: true,
                        shared: true
                    },
                    data: [{
                        name: "average time",
                        type: "spline",
                        color: "#369EAD",
                        showInLegend: true,
                        toolTipContent: "{name} :  {yVal} ms <br/> ",
                        highlightEnabled: true,
                        nModified: -1,
                        max: limit,
                        dataPoints: []
                    }, {
                        name: "longest time",
                        type: "spline",
                        color: "#C0504E",
                        showInLegend: true,
                        xValueFormatString: "HH:mm:ss",
                        toolTipContent: "{name} :  {yVal} ms <br/> @ {x} ",
                        highlightEnabled: true,
                        nModified: -1,
                        max: limit,
                        dataPoints: []
                    }],
                    legend: {
                        cursor: "pointer",
                        itemclick: function (e) {
                            if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                                var data1 = getDataSeriesForLongestDomTime(),
                                    data2 = getDataSeriesForAverageDomTime();
                                if ((data1.dataPoints === e.dataSeries.dataPoints && (data2.visible || data2.visible === undefined)) ||
                                    (data2.dataPoints === e.dataSeries.dataPoints && (data1.visible || data1.visible === undefined))) {
                                    e.dataSeries.visible = false;
                                    changeyMaxLimit(null);
                                }
                            }
                            else {
                                e.dataSeries.visible = true;
                                if (getDataSeriesForLongestDomTime().maxYOccurance > 0 || getDataSeriesForAverageDomTime().maxYOccurance > 0) {
                                    changeyMaxLimit(1200);
                                }
                            }
                            chart.render();
                        }

                    }
                };

                function getDataSeriesForLongestDomTime() {
                    return chartOptions.data[LONGEST_DS];
                }

                function getDataSeriesForAverageDomTime() {
                    return chartOptions.data[AVG_DS];
                }

                function changeyMaxLimit(changeTo) {
                    chartOptions.axisY.maximum = changeTo;
                    var points1 = getDataSeriesForLongestDomTime().dataPoints;
                    var points2 = getDataSeriesForAverageDomTime().dataPoints;
                    _.forEach(points1, function (p1, i) {
                        updatePointYVal(p1, changeTo);
                        emphasizeDataPointMarker(i, points1, changeTo);
                        updatePointYVal(points2[i], changeTo);
                        emphasizeDataPointMarker(i, points2, changeTo);
                    });
                }

                this.update = function (highlightInfo, reset) {
                    var point1, point2,
                        max = chartOptions.axisY.maximum,
                        prevOccurance1 = getDataSeriesForLongestDomTime().maxYOccurance,
                        prevOccurance2 = getDataSeriesForAverageDomTime().maxYOccurance,
                        newOccurance1, newOccurance2;
                    if (reset) {
                        initChartData(chartOptions, LONGEST_DS);
                        initChartData(chartOptions, AVG_DS);
                    }

                    point1 = addUpdateDataPoint(chartOptions, LONGEST_DS, !!(highlightInfo && highlightInfo.domAverageTime));
                    point2 = addUpdateDataPoint(chartOptions, AVG_DS, !!(highlightInfo && highlightInfo.domAverageTime));

                    if (highlightInfo && highlightInfo.domLongest) {
                        point1.yVal = Math.ceil(highlightInfo.domLongest);
                        updatePointYVal(point1, 1200, getDataSeriesForLongestDomTime());
                    }
                    if (highlightInfo && highlightInfo.domAverageTime) {
                        point2.y = point2.yVal = Math.ceil(highlightInfo.domAverageTime);
                        updatePointYVal(point2, 1200, getDataSeriesForAverageDomTime());
                    }
                    newOccurance1 = getDataSeriesForLongestDomTime().maxYOccurance;
                    newOccurance2 = getDataSeriesForAverageDomTime().maxYOccurance;
                    if (prevOccurance1 !== newOccurance1 || prevOccurance2 !== newOccurance2) {
                        if (newOccurance1 > 1 || newOccurance2 > 1) {
                            emphasizeDataPointMarker(point1, getDataSeriesForLongestDomTime().dataPoints, max);
                            emphasizeDataPointMarker(point2, getDataSeriesForAverageDomTime().dataPoints, max);
                        } else if (newOccurance1 === 1 || newOccurance2 === 1) {
                            changeyMaxLimit(1200);
                        } else {
                            changeyMaxLimit(null);
                        }
                    } else {
                        emphasizeDataPointMarker(point1, getDataSeriesForLongestDomTime().dataPoints, max);
                        emphasizeDataPointMarker(point2, getDataSeriesForAverageDomTime().dataPoints, max);
                    }
                    chart.render();
                };

                chart = new CanvasJS.Chart(id, chartOptions);

                this.update(null, true);
            };

            function createChart(id, limit) {
                $timeout(function () {
                    var container = angular.element("#" + id + "-chart-container");
                    if (container.length === 0) {
                        createChart(id, limit);
                    } else {
                        var chart = new charts[id](id + "-chart-container", limit);
                        charts.created.push(chart);
                    }
                });
            }

            return ({
                createCharts: function (limit, ...ids) {
                    ids.forEach(function (id) {
                        createChart(id, limit);
                    });
                },
                updateAllCharts: function (info, reset) {
                    charts.created.forEach(function (chart) {
                        chart.update(info, reset);
                    });
                }
            });
        }]);

}(angular));