(function (angular, birbalJS) {
  'use strict';

  angular.module('birbal-app', ['background-service-app', 'panel-view-app'])
    .controller('panelViewController', ['$scope', 'backgroundService', '$timeout', function ($scope,
      backgroundService, $timeout) {
      // default first message on inspect tab load, letting app know I'm ready
      // send after listener setup
      backgroundService.informBackground(null, 'init', birbalJS.END_POINTS.BACKGROUND);
      var actionList = [];
      $scope.settings = {};
      /////////////////////////////////////////////////////////
      //            background action listener
      /////////////////////////////////////////////////////////
      $scope.$on('panelActions', function (event, actions) {
        actions.forEach(function (detail) {
          actionList[detail.action].apply(null, detail.args);
        });
      });

      actionList.changePanelView = function (viewName, viewData) {
        // viewname is html file in partials
        // activate viewname in sidebar if exists
        $('li[view-name]').removeClass('active');
        $('li[view-name="' + viewName + '"]').addClass('active');

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
          actionList.enabled = false;
          $timeout.cancel(timeoutpromise);
          timeoutpromise = undefined;
          $scope.digestMeasures = {
            performanceTime: [],
            max: {
              watcherMeasures: {
                scopes: {}
              }
            },
            debounceTime: 100
          };
        });
      };
      // first timeinitialization
      actionList.clearResources();

      actionList.digestMeasures = function (timeMeasure) {
        // initialize time measures for first time
        $scope.$applyAsync(function () {
          timeMeasure.startTime = Math.round(timeMeasure.startTime);
          timeMeasure.duration = Math.round(timeMeasure.duration);
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
        if (!actionList.enabled && $scope.csInfo.ngModule && viewName !== 'settings') {
          // register/enable/refresh
          backgroundService.informBackground({
            ngModule: $scope.csInfo.ngModule,
            task: 'runAnalysis'
          });
          actionList.enabled = true;
          analyzeDigestMeasures();
        }
        actionList.changePanelView(viewName);
      };

      //sidebar for html use
      $scope.sidebar = sidebar;
      /////////////////////////////////////////////////////////
      //            initpage view
      /////////////////////////////////////////////////////////
      $scope.initpage = {};
      $scope.initpage.enableMe = function () {
        // register/enable/refresh
        $scope.csInfo.ngModule = $scope.csInfo.ngModule || $scope.csInfo.ngModuleInput;
        sidebar.changePanelView('dashboard');
      };

      /////////////////////////////////////////////////////////
      //            settings view
      /////////////////////////////////////////////////////////
      $scope.$watch('settings.properties', function scopePropSettingsHandler(newval) {
        var sidebarAction = actionList.enabled && newval ? 'addSidebar' : 'removeSidebar';
        birbalJS.setElementPanelAction(sidebarAction);
      });

      /////////////////////////////////////////////////////////
      //            analysis on data
      /////////////////////////////////////////////////////////
      var lastMesuredIndex = 0,
        timeoutpromise;

      function analyzeDigestMeasures() {
        // create summary for digest
        // expensive
        var longest = $scope.digestMeasures.max.duration || 0;
        // create array of digest rates with help of debounce range - find max for summary
        // each array item value will be {startind:0, n:0}
        var effectiveDRates = $scope.digestMeasures.edr = $scope.digestMeasures.edr || [];
        // edr range : curr start - prev end < debounceTime
        // ideally each digest cycle should debounce time with one another to have better performance - SIMPLE PAGE can achieve as no user inter-action
        var debounceTime = $scope.digestMeasures.debounceTime,
          prevEndtime = $scope.digestMeasures.performanceTime[lastMesuredIndex - 1] && $scope.digestMeasures.performanceTime[
            lastMesuredIndex - 1].endTime,
          // prev or 0
          edrind = effectiveDRates.length ? effectiveDRates.length - 1 : 0;
        // watchers max computations
        var watchmax = $scope.digestMeasures.max.watcherMeasures.counts = $scope.digestMeasures.max.watcherMeasures
          .counts || {
            dirty: 0,
            total: 0,
            dirtyexpensive: false,
            totalexpensive: false
          };
        // scopes max computations
        var maxnScopes = $scope.digestMeasures.max.watcherMeasures.scopes.total || 0;
        var maxndirtyscopes = $scope.digestMeasures.max.watcherMeasures.scopes.dirty || 0;
        // continue from where we left - do it only for new added ones
        $scope.digestMeasures.performanceTime.slice(lastMesuredIndex).forEach(function (aDigest, ind, list) {
          longest = longest < aDigest.duration ? aDigest.duration : longest;
          // find prev end time
          aDigest.endTime = aDigest.startTime + aDigest.duration;
          prevEndtime = prevEndtime || aDigest.endTime;
          if ((aDigest.startTime - prevEndtime) > debounceTime) {
            // finish recording current and start new one
            effectiveDRates[edrind].n = lastMesuredIndex + ind - effectiveDRates[edrind].startind;
            effectiveDRates[edrind].endTime = prevEndtime;
            edrind++;
            effectiveDRates[edrind] = {
              startind: lastMesuredIndex + ind,
              startTime: aDigest.startTime
            };
          } else {
            effectiveDRates[edrind] = effectiveDRates[edrind] || {
              startind: lastMesuredIndex + ind,
              startTime: aDigest.startTime
            };
          }
          prevEndtime = aDigest.endTime;
          ///////////////////////////////////// end of digest
          ///////// watch measures
          if (watchmax.dirty < aDigest.watcherMeasures.counts.dirty) {
            watchmax.dirty = aDigest.watcherMeasures.counts.dirty;
            watchmax.dirtyexpensive = longest === aDigest.duration
          }
          if (watchmax.total < aDigest.watcherMeasures.counts.total) {
            watchmax.total = aDigest.watcherMeasures.counts.total;
            watchmax.totalexpensive = longest === aDigest.duration
          }
          /////////////////////////////////////////// end of watch
          /////scopes
          maxnScopes = maxnScopes > aDigest.watcherMeasures.scopes.total ? maxnScopes : aDigest.watcherMeasures
            .scopes.total;
          var dsids = Object.keys(aDigest.watcherMeasures.scopes.dirty).length;
          maxndirtyscopes = maxndirtyscopes > dsids ? maxndirtyscopes : dsids;
          /////////////////////////////////////////////////////////////////////////////////////////////
          ////////////////end of foreach
        });
        lastMesuredIndex = $scope.digestMeasures.performanceTime.length;
        $scope.digestMeasures.max.duration = longest;
        $scope.digestMeasures.max.watcherMeasures.scopes.total = maxnScopes;
        $scope.digestMeasures.max.watcherMeasures.scopes.dirty = maxndirtyscopes;
        var maxedr = $scope.digestMeasures.max.edr || {
          duration: 0,
          n: 0
        };

        if (edrind) {
          effectiveDRates[edrind].n = lastMesuredIndex - effectiveDRates[edrind].startind;
          effectiveDRates[edrind].endTime = prevEndtime;
          // find max time range
          effectiveDRates.forEach(function (edr, ei) {
            edr.duration = edr.endTime - edr.startTime;
            maxedr = (maxedr.duration > edr.duration) ? maxedr :
              ((edr.n > 1) ? edr :
                (maxedr.n > 1 ? maxedr : edr));
          });
        }
        // effective digest rate:  digestMeasures.max.edr.n / digestMeasures.max.edr.duration
        $scope.digestMeasures.max.edr = maxedr;
        timeoutpromise = $timeout(analyzeDigestMeasures, 500);
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
