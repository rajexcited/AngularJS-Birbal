/**
 * Created by Neel on 4/2/2016.
 */
(function (angular) {
    var myApp = angular.module('myApp', []);
    myApp.controller('myController', function ($scope, $http) {

        $http.get('mobile-data.json').success(function (response) {
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

}(angular));