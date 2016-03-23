/**
 * Created by Neel on 3/16/2016.
 */
/*global angular*/

(function (angular) {
    "use strict";

    // qq: where do i need this ? what analysis be get helpful using this ?
    /**
     * @deprecated until we find it useful in analysis
     */
    angular.module('measure.http.app', [])
        .factory('httpRecordFactory', [function () {

            var _addHttpMeasure, _getNewHttpMeasures, _getAllHttpMeasures,
                allHttpMeasures, addedMeasures;

            /**
             * httpRecordFactory.addHttpMeasure(message.msgDetails);
             * @param measureLog
             */
            _addHttpMeasure = function (measureLog) {
                // compute here and add to digest Display Data Records
                // ignoring for now - reason: undecided the use of this measure detail
            };

            _getNewHttpMeasures = function () {

            };

            _getAllHttpMeasures = function () {

            };

            return {
                addHttpMeasure: _addHttpMeasure
                //getNewHttpMeasures: _getNewHttpMeasures,
                //getAllHttpMeasures: _getAllHttpMeasures
            };

        }]);

}(angular));