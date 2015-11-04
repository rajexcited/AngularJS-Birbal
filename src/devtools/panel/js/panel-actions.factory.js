(function (angular, birbalJS) {
  'use strict';

  angular.module('panel-actions-app', [])
    .factory('panelActions', ['$rootScope', function ($rootScope) {

      var factoryInstance = this;

      /////////////////////////////////////////////////////////
      //            panel actionBuilder
      /////////////////////////////////////////////////////////
      var panelActions = {};
      panelActions.addPanel = function () {
        // only one action to init
        $rootScope.$broadcast('panelActions', [{
          action: 'changePanelView',
          args: ['initPage', this.message.data]
        }]);
        this.status('panelAdded');
      };

      panelActions.removePanel = function () {
        // cleanup resources
        // two actions - cleanup and init
        $rootScope.$broadcast('panelActions', [{
          action: 'clearResources'
        }, {
          action: 'changePanelView',
          args: ['initPage', this.message.data]
        }]);
        this.status('panelRemoved');
      };

      var digestMeasuresBox, digestTmplData;
      panelActions.digestMeasures = function () {
        $rootScope.$broadcast('panelActions', [{
          action: 'digestMeasures',
          args: [this.message.data]
        }]);
        this.status('digestMeasure added');
      };

      var panelBuilder = birbalJS.actionBuilder.build(panelActions);
      // releasing resource as it has added to panelBuilder and panelActions not needed
      panelActions = undefined;

      factoryInstance.perform = function (message, backgroundConnection, destPort, sender, sendResponse) {
        var actionBuilder =
          new panelBuilder(message, backgroundConnection, destPort, sender, sendResponse);
        actionBuilder.takeAction();
        birbalJS.locallog('background connection, msg action status? ' + actionBuilder.status());
      };

      return factoryInstance;
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////
    }]);
}(angular, birbalJS));
