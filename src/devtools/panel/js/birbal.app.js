(function (angular, birbalJS) {
  'use strict';

  angular.module('birbal-app', ['background-service-app', 'panel-view-app'])
    .controller('panelViewController', ['$scope', 'backgroundService', function ($scope, backgroundService) {
      // default first message on inspect tab load, letting app know I'm ready
      // send after listener setup
      backgroundService.informBackground(null, 'init', birbalJS.END_POINTS.BACKGROUND);
      $scope.digestMeasures = {
        performanceTime: []
      };
      var actionList = [];
      /////////////////////////////////////////////////////////
      //            background action listener
      /////////////////////////////////////////////////////////
      $scope.$on('panelActions', function (event, actions) {
        actions.forEach(function (detail) {
          actionList[detail.action].apply(null, detail.args);
        });
      });

      actionList.changePanelView = function (viewName, viewData) {
        // default is dashboard
        // viewname is html file in partials
        $scope.$applyAsync(function () {
          $scope.view = viewName;
          //initializing csInfo for template data for first time or after cleanup
          $scope.csInfo = $scope.csInfo || {};
          angular.extend($scope.csInfo, viewData);
        });
      };

      actionList.clearResources = function () {
        // clear app data
        // digestMeasuresBox = digestTmplData = undefined;
        $scope.$applyAsync(function () {
          $scope.view = '';
          delete $scope.csInfo;
          // $scope.digestMeasures = {
          //   performanceTime: []
          // };
        });
      };

      actionList.digestMeasures = function (timeMeasure) {
        // initialize time measures for first time
        $scope.$applyAsync(function () {
          $scope.digestMeasures.performanceTime.push(timeMeasure);
        });
      };
      /////////////////////////////////////////////////////////
      //            Sidebar actions
      /////////////////////////////////////////////////////////
      var sidebar = {};
      sidebar.disableme = function () {
        actionList.clearResources();
        backgroundService.informBackground(null, 'disableme', birbalJS.END_POINTS.BACKGROUND);
      };

      sidebar.changePanelView = function (viewName) {
        actionList.changePanelView(viewName);
      };

      //sidebar for html use
      $scope.sidebar = sidebar;
      /////////////////////////////////////////////////////////
      //            initpage actions
      /////////////////////////////////////////////////////////
      $scope.initpage = {};
      $scope.initpage.enableMe = function () {
        // register/enable/refresh
        backgroundService.informBackground({
          ngModule: $scope.csInfo.ngModule,
          task: 'runAnalysis'
        });
        sidebar.changePanelView('dashboard');
      };
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////

    }]);

}(angular, birbalJS));
