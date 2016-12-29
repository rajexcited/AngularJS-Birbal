/**
 * Created by Neel on 4/2/2016.
 */
(function (angular) {
    var myApp = angular.module('myApp', []);
    myApp.controller('myController', function ($scope, $http) {

        $http.get('mobile-data.json').then(function (response) {
            response = response.data;
            response.column = Object.keys(response.data[0]);
            $scope.myTable = response;
        });

        $scope.$watch('searchInput', function (searchText) {
            "use strict";

            if (searchText !== undefined) {
                if (searchText.indexOf(':') === -1) {
                    $scope.search = {$: searchText};
                } else {
                    var scol = searchText.split(':');
                    $scope.search = {};
                    $scope.search[scol[0]] = scol[1];
                }
            }
        });

    });

    myApp.directive('editCell', [function () {
        return {
            restrict: 'A',
            template: '<div class="edit">' +
            '<div class="editIcon fa fa-pencil" ng-click="editing=true" ng-show="!editing">&nbsp;</div>' +
            '<button ng-show="editing" ng-click="editing=false">Ok</button>' +
            '<span ng-show="!editing"> {{colVal}} </span>' +
            '<input type="text" ng-model="row[colName]" ng-show="editing" size="{{colVal.length<11 ? 5 : 20}}">' +
            '</div>'
        };
    }]);

}(angular));