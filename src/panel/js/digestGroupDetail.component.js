/*global angular, $*/
(function (angular) {
    "use strict";

    angular.module('digest-group-detail.component', [])
        .component('digestGroupDetail', {
            templateUrl: '../partials/digest-detail.html',
            controller: ['$element', 'DATA_NAMES', 'dataNotifierPromise', '$timeout', function ($element, DATA_NAMES, dataNotifierPromise, $timeout) {
                var $ctrl = this,
                    elementHeight = 191,
                    reposition;

                function changeData(data) {
                    var ind = data[1];
                    if (angular.isUndefined(ind)) {
                        ind = data[3].indexOf($ctrl.detail);
                    }
                    if (ind !== -1) {
                        $ctrl.detail = data[2] || $ctrl.detail;
                    } else {
                        $ctrl.detail = undefined;
                    }
                    return ind;
                }

                reposition = function () {
                    var groupRow = $("tr.group-row.add-detail-panel");

                    if (groupRow.length !== 0) {
                        $timeout(function () {
                            var diff, topPos, topSummary;
                            topSummary = $('.digest-summary-details').offset().top;
                            topPos = groupRow.offset().top + groupRow.height() - elementHeight - 5;
                            diff = Math.abs(topPos - $element.offset().top);
                            if (diff > 7) {
                                topPos -= topSummary;
                                $element.css({'top': topPos, 'left': 0, 'right': 0});
                            }
                        });
                    }
                };

                function move(index) {
                    var rows = $("tr.group-row"),
                        groupRow = $(rows.get(index));

                    // executes before timeout
                    rows.removeClass('add-detail-panel').find('td').css('padding-bottom', '');
                    groupRow.find('td').css('padding-bottom', (elementHeight + 10) + 'px');

                    $timeout(function () {
                        groupRow.addClass('add-detail-panel');
                        var topPos = groupRow.offset().top + groupRow.height() - elementHeight - 5 - groupRow.parents('.digest-summary-details').offset().top;
                        $element.css({'top': topPos, 'left': 0, 'right': 0});
                    });
                }

                function show(index) {
                    var groupRow, topPos;

                    groupRow = $($("tr.group-row").get(index));
                    topPos = groupRow.offset().top + groupRow.height() + 5 - groupRow.parents('.digest-summary-details').offset().top;
                    groupRow.addClass('add-detail-panel').find('td').css('padding-bottom', (elementHeight + 10) + 'px');
                    $element.css({'top': topPos, 'left': 0, 'right': 0});

                    $timeout(function () {
                        // expand after repositioned the element
                        $element.find('.details').collapse('show');
                    });
                }

                function hide() {
                    var rows = $("tr.group-row");

                    $timeout(function () {
                        // collapse request
                        $element.find('.details').collapse('hide');
                        rows.find('td').css('padding-bottom', '');
                    });

                    function resetElement() {
                        $timeout(function () {
                            $element.css({'top': ''});
                            rows.removeClass('add-detail-panel');
                        }, 10);
                        $element.off('hidden.bs.collapse', resetElement);
                    }

                    $element.on('hidden.bs.collapse', resetElement);
                }

                function hideForcibly() {
                    if ($('tr.group-row.add-detail-panel').length !== 0) {
                        $element.css({'height': '0', 'overflow': 'hidden'});
                        $element.find('.details').collapse('hide');
                        $timeout(function () {
                            $element.css({'height': '', 'overflow': ''});
                        }, 50);
                    }
                }

                dataNotifierPromise.getNotifyFor([DATA_NAMES.DIGEST_GROUP_DETAIL_TOGGLE], function (data) {
                    var openState = data[DATA_NAMES.DIGEST_GROUP_DETAIL_TOGGLE][0],
                        ind;

                    ind = changeData(data[DATA_NAMES.DIGEST_GROUP_DETAIL_TOGGLE]);
                    if (ind === -1) {
                        hideForcibly();
                    } else if (openState === 0) {
                        hide();
                    } else if (openState === 1) {
                        show(ind);
                    } else if (data[DATA_NAMES.DIGEST_GROUP_DETAIL_TOGGLE][2]) {
                        move(ind);
                    } else {
                        reposition(ind);
                    }

                });

            }]
        });

}(angular));