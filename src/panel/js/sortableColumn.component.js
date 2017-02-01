/*global angular, $*/
(function (angular) {
    "use strict";

    angular.module('sortable-column.component', [])
        .component('sortableColumn', {
            transclude: true,
            template: '<div><ng-transclude></ng-transclude><i class="fa fa-fw unsorted fa-unsorted"></i></div>',
            bindings: {
                sortType: '@',
                predicate: '@',
                sortBy: '='
            },
            controller: function ($scope, $element) {
                var $ctrl = this,
                    ALPHA_TYPE = 'alpha',
                    NUMERIC_TYPE = 'numeric';

                function getSortOrder(isAtInit) {
                    var sortOrder = {prev: '', curr: ''},
                        ASCENDING = 'asc',
                        DESCENDING = 'desc',
                        UNSORTED = 'unsorted',
                        icon, revSIGN;

                    icon = sortOrder.icon = $element.find('i.fa');
                    if (icon.hasClass(UNSORTED)) {
                        // init with predicate and remove unsorted
                        if ($ctrl.predicate.indexOf('+') === 0) {
                            sortOrder.curr = ASCENDING;
                            revSIGN = '-';
                        } else {
                            sortOrder.curr = DESCENDING;
                            revSIGN = '+';
                        }
                        if (isAtInit === true) {
                            var pInd = $ctrl.sortBy.indexOf($ctrl.predicate),
                                prInd = $ctrl.sortBy.indexOf(revSIGN + $ctrl.predicate.substr(1));

                            if (pInd !== -1) {
                                sortOrder.curr = DESCENDING;
                                sortOrder.prev = ASCENDING;
                                icon.removeClass(UNSORTED + ' fa-' + UNSORTED);
                            } else if (prInd !== -1) {
                                sortOrder.curr = ASCENDING;
                                sortOrder.prev = DESCENDING;
                                icon.removeClass(UNSORTED + ' fa-' + UNSORTED);
                            }
                        } else {
                            icon.removeClass(UNSORTED + ' fa-' + UNSORTED);
                        }
                    }
                    else if (icon.hasClass(DESCENDING)) {
                        sortOrder.curr = ASCENDING;
                        sortOrder.prev = DESCENDING;
                    } else {
                        sortOrder.curr = DESCENDING;
                        sortOrder.prev = ASCENDING;
                    }

                    return sortOrder;
                }

                function changeSortOrder(isAtInit) {
                    var sortOrder, sortType = '';
                    sortOrder = getSortOrder(isAtInit);

                    if (isAtInit === true && !sortOrder.prev) {
                        throw new Error('no init change detected.');
                    }

                    if ($ctrl.sortType === ALPHA_TYPE) {
                        sortType = ALPHA_TYPE + '-';
                    } else if ($ctrl.sortType === NUMERIC_TYPE) {
                        sortType = NUMERIC_TYPE + '-';
                    }

                    sortOrder.icon.addClass(sortOrder.curr + ' fa-sort-' + sortType + sortOrder.curr)
                        .removeClass(sortOrder.prev + ' fa-sort-' + sortType + sortOrder.prev);

                    // now change sortBy
                    var predicateAsc = '+' + $ctrl.predicate.substr(1),
                        predicateDesc = '-' + $ctrl.predicate.substr(1);
                    _.remove($ctrl.sortBy, function (exp) {
                        return (exp === predicateAsc || exp === predicateDesc);
                    });

                    if (sortOrder.curr === 'asc') {
                        $ctrl.sortBy.unshift(predicateAsc);
                    } else {
                        $ctrl.sortBy.unshift(predicateDesc);
                    }
                }

                $element.on('click', changeSortOrder);

                $ctrl.$postLink = function () {
                    try {
                        changeSortOrder(true);
                    } catch (e) {
                    }
                };

            }
        });

}(angular));