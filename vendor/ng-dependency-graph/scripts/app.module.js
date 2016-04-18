angular.module('ngDependencyGraph', ['ngDependencyGraph.infoPanel'])
  .run(function($rootScope, currentView) {
    //dev.exposeGlobalObject();
    $rootScope.currentView = currentView;
  });