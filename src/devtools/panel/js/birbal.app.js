(function (angular, birbalJS) {
  'use strict';

  angular.module('birbal-app', ['background-service-app', 'panel-view-app'])
    .controller('panelViewController', ['$scope', 'backgroundService', '$timeout', function ($scope,
      backgroundService, $timeout) {
      // default first message on inspect tab load, letting app know I'm ready
      // send after listener setup
      backgroundService.informBackground(null, 'init', birbalJS.END_POINTS.BACKGROUND);
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
          $scope.enabled = false;
          $scope.digestMeasures = {
            performanceTime: [],
            max: {},
            debounceTime: 100
          };
        });
      };
      // first timeinitialization
      actionList.clearResources();

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
        if (!$scope.enabled && $scope.csInfo.ngModule) {
          // register/enable/refresh
          backgroundService.informBackground({
            ngModule: $scope.csInfo.ngModule,
            task: 'runAnalysis'
          });
        }
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
        $scope.csInfo.ngModule = $scope.csInfo.ngModule || $scope.csInfo.ngModuleInput;
        backgroundService.informBackground({
          ngModule: $scope.csInfo.ngModule,
          task: 'runAnalysis'
        });
        $scope.enabled = true;
        sidebar.changePanelView('dashboard');
        analyzeDigestMeasures();
      };

      /////////////////////////////////////////////////////////
      //            analysis on data
      /////////////////////////////////////////////////////////
      var lastMesuredIndex = 0;

      function analyzeDigestMeasures() {
        // create summary for digest
        // expensive
        var longest = $scope.digestMeasures.max.duration || 0;
        // throttle digestMeasures.throttle.total}} / {{digestMeasures.throttle.duration
        // each item value will be {startind:0, n:0}
        var throttles = [];
        // var throttles = [{
        //   startTime: $scope.digestMeasures.performanceTime[lastMesuredIndex].startTime,
        //   endTime: $scope.digestMeasures.performanceTime[lastMesuredIndex].startTime +
        //     $scope.digestMeasures.performanceTime[lastMesuredIndex].duration,
        //   n: 0,
        //   finished: false
        // }];
        var debounceTime = $scope.digestMeasures.debounceTime,
          endtime = throttle.endTime,
          tind = 0;
        // continue from where we left - do it only for new added ones
        $scope.digestMeasures.performanceTime.slice(lastMesuredIndex).forEach(function (aDigest, ind, list) {
          longest = longest < aDigest.duration ? aDigest.duration : longest;
          // not debounce = throttle
          aDigest.endTime = aDigest.startTime + aDigest.duration;
          endtime = $scope.digestMeasures.performanceTime[ind + lastMesuredIndex - 1].endTime || aDigest.endTime;
          if ((aDigest.startTime - endtime) > debounceTime) {
            // record to throttle
            throttles[tind].n = lastMesuredIndex + ind;
            //   throttles[tind].finished = true;
            //   throttles[tind].endTime = endtime;
            //   tind++;
            //   throttles[tind] = {startTime:aDigest.startTime,n=0};
          } else {
            throttles[tind] = throttles[tind] || {
              startind: lastMesuredIndex + ind
            };
          }
          // throttles[tind].n++;
          // // for next iteration
          // endtime = aDigest.startTime + aDigest.duration;
        });
        // if (!throttles[tind].finished) {
        //   throttles[tind].finished = true;
        //   throttles[tind].endTime = endtime;
        // }
        // $scope.digestMeasures.throttle = throttles.concat($scope.digestMeasures.throttle);
        lastMesuredIndex = $scope.digestMeasures.performanceTime.length;
        $scope.digestMeasures.max.duration =
          Math.round(longest);
        $timeout(analyzeDigestMeasures, 500);
      }
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////

    }]);


  /////////////////////////////////////////////////////////
  //            AdminLTE boorstrap options setup
  /////////////////////////////////////////////////////////
  // slimscroll not needed here
  $.AdminLTE.options.sidebarSlimScroll = false;
  $.fn.slimScroll = $.noop;
  //////
  // sidebar collapse/expand on responsive
  var mediaWidth = $.AdminLTE.options.screenSizes.md,
    mq = matchMedia('(max-width: ' + mediaWidth + 'px)');

  function mqListener(mql) {
    var sidebar_collapse = $('body').hasClass('sidebar-collapse');
    if (mql.matches && !sidebar_collapse) {
      // collapse on med
      $($.AdminLTE.options.sidebarToggleSelector).trigger('click');
    } else if (!mql.matches && sidebar_collapse) {
      // expand on large
      $($.AdminLTE.options.sidebarToggleSelector).trigger('click');
    }
  }
  mq.addListener(mqListener);
  window.setTimeout(function () {
    mqListener(mq);
  }, 250);
  /////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////

}(angular, birbalJS));
