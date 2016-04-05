/*global $,angular*/
(function (angular) {
    'use strict';

    angular.module('searchCriteria.watch.app', [])
        .directive('searchWatch', [function () {

            var tmpl = '<div class="input-group input-group-sm">' +
                '<div class="input-group-btn">' +
                '<button type="button" class="btn dropdown-toggle" data-toggle="dropdown">' +
                '{{search[0].selected.name}} <span class="fa fa-caret-down"></span></button>' +
                '<ul class="dropdown-menu">' +
                '<li ng-repeat="action in search[0].actions | filter: search[0].selectedAction"><a ng-click="selectAction(action, search[0]);">' +
                '{{::action.name}}</a></li> </ul>' +
                '</div> <!-- /btn-group -->' +
                '<input type="text" class="form-control" ng-model="search[0].inValue">' +
                '</div> <!-- /input-group -->';

            return {
                restrict: 'AE',

                template: tmpl + '<div style="padding:6px;"> AND </div>' + tmpl.replace(/search\[0\]/g, 'search[1]'),
                // isolating scope
                scope: {
                    searchWatch: '='
                },
                link: function (scope, element, attr) {
                    if (!scope.searchWatch) {
                        scope.searchWatch = {};
                    }
                    scope.searchWatch.filterBy = {};

                    var criteria = {};
                    scope.search = [];
                    function init(search) {
                        var srch = {
                            inValue: '',
                            actions: [
                                {code: '$', name: 'Any'},
                                {code: 'exp', name: 'watch expression'},
                                {code: 'eq', name: 'Equality'},
                                {code: 'nGet', name: 'nGet'},
                                {code: 'timeGet', name: 'timeGet'},
                                {code: 'nFn', name: 'nFn'},
                                {code: 'timeFn', name: 'timeFn'},
                                {code: 'runtime', name: 'total time'},
                                {code: 'nUsedMax', name: 'n Used Max'},
                                {code: 'nUsed', name: 'n Used '}
                            ],
                            selectedAction: {}
                        };
                        search.push(srch);
                        search.push(angular.copy(srch));
                        search[0].selected = search[0].actions[0];
                        search[1].selected = search[1].actions[1];

                        search[0].selectedAction.code = '!' + search[1].selected.code;
                        search[1].selectedAction.code = '!' + search[0].selected.code;
                    }

                    init(scope.search);

                    function setInValue(search) {
                        var input = search.inValue.trim(),
                            code = search.selected.code,
                            range;
                        criteria[code] = criteria[code] || {};
                        criteria[code].hasComma = input.indexOf(',') !== -1;
                        criteria[code].hasDash = input.split('-').length === 2;
                        criteria[code].isExact = !criteria[code].hasComma && !criteria[code].hasDash;

                        if (criteria[code].isExact) {
                            scope.searchWatch.filterBy[code] = input;
                            delete criteria[code];
                        } else {
                            if (criteria[code].hasComma) {
                                input = input.split(',');
                            } else if (criteria[code].hasDash) {
                                range = input.split('-');
                                input = {min: range[0], max: range[1]};
                            }
                            criteria[code].value = input;
                            delete scope.searchWatch.filterBy[code];
                        }
                    }

                    function removeOldSelection(search) {
                        var code = search.selected.code;
                        delete criteria[code];
                        delete scope.searchWatch.filterBy[code];
                    }

                    scope.selectAction = function (action, srch) {
                        removeOldSelection(srch);
                        if (scope.search[0] === srch) {
                            scope.search[1].selectedAction = {'code': '!' + action.code};
                        } else {
                            scope.search[0].selectedAction = {'code': '!' + action.code};
                        }
                        srch.selected = action;
                        setInValue(srch);
                    };

                    scope.$watch('search[0].inValue', function (input) {
                        setInValue(scope.search[0]);
                    });
                    scope.$watch('search[1].inValue', function (input) {
                        setInValue(scope.search[1]);
                    });

                    function filterbyCode(code, mWatch) {
                        if (criteria[code]) {
                            var input = criteria[code].value,
                                mwexp = mWatch[code],
                                l, matchAny;
                            if (criteria[code].hasComma) {
                                l = input.length;
                                matchAny = false;
                                while (!matchAny && l--) {
                                    matchAny = mwexp.indexOf(input[l]) !== -1;
                                }
                                return matchAny;
                            }
                            if (criteria[code].hasDash) {
                                mwexp = parseFloat(mwexp);
                                return mwexp <= input.max && mwexp >= input.min;
                            }
                        }
                        return true;
                    }

                    scope.searchWatch.filterByFn = function (mWatch) {
                        var code1 = scope.search[0].selected.code,
                            code2 = scope.search[1].selected.code;

                        return filterbyCode(code1, mWatch) && filterbyCode(code2, mWatch);
                    };
                }
            };
        }]);

}(angular));
