'use strict';

angular.module('ngDependencyGraph')
  .factory('ModuleStats', function() {

    function ModuleStats(module) {
      this.module = module;
    }

    _.assign(ModuleStats.prototype, {
      
      mostUsed: function() {
        var nodes = this.module.nodes;
      }

    });

    return ModuleStats;

  });
