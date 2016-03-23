/**
 * Created by Neel on 3/16/2016.
 */

/*global angular*/
(function (angular) {
    "use strict";

    angular.module('measure.digest.app', [])
        .factory('digestDataFactory', [function () {

            var addDigestMeasure, getAllDigestMeasures, modifyDigestDebounceTime, getDigestDebounceTime, resetDigestMeasures,
                _addApplyMeasureLog, _getScopesAndWatchersForOneDigest, _analyzeEdrForMeasure, _createWatchMeasures, _addWatchMeasures,
                lastDigestMeasure, lastApplyMeasure, digestDetails,
            //digestDetails = {
            //    highlights: {
            //        longestDigestTime: 0,
            //        edr: null,
            //        dirtyWatchers: 0,
            //        nWatchers: 0,
            //        //qq: NEEL find out how can i determine ? ex. watch consumes 80% of digest in longest cycle time. watch are heavy, expensive.
            //        redLightWatchMsg: ''
            //    },
            //    measures: []
            //},
                allApplyMeasures = [],
                watchDetails = {highlights: {}, measures: []},
            //addedMeasures = {_digest: [], _apply: [], _watch: []},
            // time in ms
                digestDebounceTime = 200;

            /**
             *
             * @param measureLog
             * @private
             */
            _addApplyMeasureLog = function (measureLog) {
                if (lastApplyMeasure && measureLog.applyEndTime !== undefined) {
                    lastApplyMeasure.endTime = measureLog.applyEndTime;
                    lastApplyMeasure.runtime = lastApplyMeasure.endTime - lastApplyMeasure.startTime;
                    //addedMeasures._apply.push(lastApplyMeasure);
                    allApplyMeasures.push(lastApplyMeasure);
                    lastApplyMeasure = undefined;
                }
                if (measureLog.applyStartTime !== undefined) {
                    lastApplyMeasure = {};
                    lastApplyMeasure.startTime = measureLog.applyStartTime;
                }

                delete measureLog.applyEndTime;
                delete measureLog.applyStartTime;
            };

            _getScopesAndWatchersForOneDigest = function (oneDigestMeasure) {
                // scope
                var nuWatcher, nWatchers = 0, nWasteWatchers = 0, nScopes = 0, nWatchersTime = 0, nWasteWatchersTime = 0, _watchers;
                angular.forEach(oneDigestMeasure.scope, function (scope) {
                    // find watchers
                    nWatchers = nWatchers + scope.watchers.length;
                    nScopes++;
                    _watchers = [];

                    function eachScopeWatcher(watcher) {
                        if (!watcher) {
                            return;
                        }
                        nuWatcher = {'nGet': 0, 'timeGet': 0, 'nFn': 0, 'timeFn': 0, 'exp': '', 'eq': false};
                        nuWatcher.nGet = watcher.length;
                        nuWatcher.exp = watcher[0].exp;
                        nuWatcher.eq = watcher[0].eq;
                        // first and last always object with get and fn
                        var len = watcher.length;

                        function eachWatcherGet(onewatch) {
                            var gettime = (typeof onewatch === 'object') ? onewatch.get : onewatch;
                            nuWatcher.timeGet = nuWatcher.timeGet + gettime;
                            // last is fn
                            nuWatcher.timeFn = onewatch.fn || nuWatcher.timeFn;
                        }

                        while (len--) {
                            eachWatcherGet(watcher[len]);
                        }
                        nuWatcher.runtime = nuWatcher.timeGet + nuWatcher.timeFn;
                        nuWatcher.wasteOnGetOnly = nuWatcher.timeFn === 0;
                        if (nuWatcher.wasteOnGetOnly) {
                            ++nWasteWatchers;
                            nuWatcher.wasteRuntime = nuWatcher.runtime;
                            nWasteWatchersTime = nWasteWatchersTime + nuWatcher.runtime;
                        } else {
                            nuWatcher.nFn = 1;
                        }
                        nWatchersTime = nWatchersTime + nuWatcher.runtime;
                        nuWatcher.scope = scope.$id;
                        _watchers.push(nuWatcher);
                    }

                    var iscw, scopeWatcherLen = scope.watchers.length;
                    for (iscw = 0; iscw < scopeWatcherLen; iscw++) {
                        eachScopeWatcher(scope.watchers[iscw]);
                    }
                    scope.watchers = _watchers;
                    // generate scope tree - no need
                });
                oneDigestMeasure.nWatchers = nWatchers;
                oneDigestMeasure.nDirtyWatchers = nWatchers - nWasteWatchers;
                oneDigestMeasure.nScopes = nScopes;
                oneDigestMeasure.nWatchersRuntime = nWatchersTime;
                oneDigestMeasure.nWasteWatchersTime = nWasteWatchersTime;
            };

            _createWatchMeasures = function (digestMeasure) {
                var scwexp,
                    wexp = [],
                    watchHolder = [];
                // iterate scope watchers
                // get all exp for scope watchers
                // find duplicate exp and merge them
                // no duplicate - add to new list

                function mergeWatchByExpression(wex, watcherToAdd) {
                    var fst, lst;
                    fst = wexp.indexOf(wex);
                    lst = wexp.lastIndexOf(wex);
                    if (lst !== fst && watchHolder[fst].eq !== watcherToAdd.eq) {
                        // merge
                        watchHolder[fst].nGet = watchHolder[fst].nGet + watcherToAdd.nGet;
                        watchHolder[fst].nFn = watchHolder[fst].nFn + watcherToAdd.nFn;
                        watchHolder[fst].timeGet = watchHolder[fst].timeGet + watcherToAdd.timeGet;
                        watchHolder[fst].timeFn = watchHolder[fst].timeFn + watcherToAdd.timeFn;
                        watchHolder[fst].runtime = watchHolder[fst].runtime + watcherToAdd.runtime;
                        watchHolder[fst].wasteOnGetOnly = watchHolder[fst].timeFn === 0 || watchHolder[fst].nFn < 2;
                        watchHolder[fst].wasteRuntime = watchHolder[fst].wasteRuntime + watcherToAdd.wasteRuntime;
                        watchHolder[fst].scope = watchHolder[fst].scope + ',' + watcherToAdd.scope;
                        watchHolder[fst].nUsed = watchHolder[fst].scope.split(',').length;
                    } else {
                        watchHolder.push(watcherToAdd);
                    }
                }

                angular.forEach(digestMeasure.scope, function (scope) {
                    scwexp = scope.watchers.map(function (w) {
                        return w.exp;
                    });
                    var i, len = scwexp.length;
                    for (i = 0; i < len; i++) {
                        wexp.push(scwexp);
                        mergeWatchByExpression(scwexp[i], scope.watchers[i]);
                    }
                });

                return watchHolder;
            };

            _addWatchMeasures = function (watchMeasures) {
                // find duplicates in 2 array and merge

                var i, len, exp1, exp2, detailWatchMeasures = watchDetails.measures;
                // here exp1 has unique items as well as exp2
                // merging both can generate duplicates
                exp1 = detailWatchMeasures.map(function (w) {
                    return w.exp;
                });
                exp2 = watchMeasures.map(function (w) {
                    return w.exp;
                });

                // duplication possibilities
                function mergeWatchByExpression(w, ind2) {
                    var /*scopeIds, scopes,*/ ind1;

                    ind1 = exp1.indexOf(w);
                    if (ind1 !== -1 && detailWatchMeasures[ind1].eq !== watchMeasures[ind2].eq) {
                        // merge
                        detailWatchMeasures[ind1].nGet = detailWatchMeasures[ind1].nGet + watchMeasures[ind2].nGet;
                        detailWatchMeasures[ind1].nFn = detailWatchMeasures[ind1].nFn + watchMeasures[ind2].nFn;
                        detailWatchMeasures[ind1].timeGet = detailWatchMeasures[ind1].timeGet + watchMeasures[ind2].timeGet;
                        detailWatchMeasures[ind1].timeFn = detailWatchMeasures[ind1].timeFn + watchMeasures[ind2].timeFn;
                        detailWatchMeasures[ind1].runtime = detailWatchMeasures[ind1].runtime + watchMeasures[ind2].runtime;
                        detailWatchMeasures[ind1].wasteOnGetOnly = detailWatchMeasures[ind1].timeFn === 0 || detailWatchMeasures[ind1].nFn < 2;
                        detailWatchMeasures[ind1].wasteRuntime = detailWatchMeasures[ind1].wasteRuntime + watchMeasures[ind2].wasteRuntime;
                        detailWatchMeasures[ind1].scope = detailWatchMeasures[ind1].scope + ',' + watchMeasures[ind2].scope;
                        //scopeIds = (detailWatchMeasures[ind1].scope + ',' + watchMeasures[ind2].scope).split(',');
                        //// revisit this block and perform only if user wil ask for it
                        //// create scope occurrence table
                        //scopes = [];
                        //scopeIds.forEach(function (id) {
                        //    var lst, fst;
                        //    if (!id) {
                        //        return;
                        //    }
                        //    lst = scopeIds.lastIndexOf(id);
                        //    fst = scopeIds.indexOf(id);
                        //    if (lst !== fst) {
                        //        // delete last duplicate
                        //        scopeIds.splice(lst, 1);
                        //    }
                        //    if (!scopes[fst]) {
                        //        scopes[fst] = {};
                        //        scopes[fst][id] = 0;
                        //    }
                        //    scopes[fst][id]++;
                        //});
                        //detailWatchMeasures[ind1].scope = JSON.stringify(scopes);
                        if (detailWatchMeasures[ind1].nUsed < watchMeasures[ind2].nUsed) {
                            detailWatchMeasures[ind1].nUsed = watchMeasures[ind2].nUsed;
                        }
                    } else {
                        // add unique
                        detailWatchMeasures.push(watchMeasures[ind2]);
                    }
                }

                if (exp1.length) {
                    len = exp2.length;
                    for (i = 0; i < len; i++) {
                        mergeWatchByExpression(exp2[i], i);
                    }
                } else {
                    // first time only - add all watchMeasures to detail
                    Array.prototype.push.apply(detailWatchMeasures, watchMeasures);
                }
            };

            // create summary for digest
            _analyzeEdrForMeasure = function (aMeasure, edr, measures, lastDigestMeasure) {
                // edr = effective digest rate, calculated using digest debounce time
                var mPrev, m, dmlen, nuedr;

                function _createEdr(digestM) {
                    return {'start': digestM.startTime, 'end': digestM.endTime, 'runtime': 0, 'nDigest': 0};
                }

                // create array of digest rates with help of debounce range - find max for summary
                // each array item value will be {startind:0, n:0}
                // edr range : curr start - prev end < debounceTime
                // ideally each digest cycle should debounce time with one another to have better performance - SIMPLE PAGE can achieve as no user inter-action
                // edr = {startTime, endTime, runtime, nDigest};
                // here 'runtime' takes precedence over 'nDigest' in case of any clash of data

                edr = edr || _createEdr(aMeasure);
                if ((aMeasure.startTime - edr.end) <= digestDebounceTime) {
                    // found new point for current edr - modify it
                    edr.end = aMeasure.endTime;
                    edr.runtime = edr.end - edr.start;
                    edr.nDigest++;
                } else if (lastDigestMeasure && (aMeasure.startTime - lastDigestMeasure.endTime) <= digestDebounceTime) {
                    // find new possible edr
                    nuedr = _createEdr(aMeasure);
                    m = aMeasure;
                    dmlen = measures.length;
                    while (dmlen) {
                        dmlen--;
                        mPrev = measures[dmlen];
                        if ((m.startTime - mPrev.endTime) > digestDebounceTime) {
                            break;
                        }
                        nuedr.start = mPrev.startTime;
                        m = mPrev;
                    }
                    nuedr.runtime = nuedr.end - nuedr.start;
                    nuedr.nDigest = measures.length - dmlen + 1;
                    // precedence to runtime
                    if (nuedr.runtime > edr.runtime) {
                        edr = nuedr;
                    }
                }
                measures.push(aMeasure);
                return edr;
            };

            /**
             * finds
             * digest rate  & max rate
             * longest digest time
             * max watch time
             * effective digest rate = edr depends on digest debounce time
             * need to find wasted scopes - which slows performance and holds DOM - doesnt get clear or takes a lot of time.
             *
             * @param measureLog
             */
            addDigestMeasure = function (measureLog) {
                // compute here and add to digest Display Data Records
                var watchMeasures, edr;

                measureLog.runtime = measureLog.endTime - measureLog.startTime;
                _addApplyMeasureLog(measureLog);
                _getScopesAndWatchersForOneDigest(measureLog);
                measureLog.otherRuntime = measureLog.runtime - measureLog.nWatchersRuntime;
                // postDigest, and nothing for asyncQueue
                if (measureLog.postDigestQueue) {
                    measureLog.postDigestQueue = JSON.parse(measureLog.postDigestQueue);
                }
                // do nothing for emit and broadcast events
                // do nothing on error message for uncompleted digest cycle
                watchMeasures = _createWatchMeasures(measureLog);
                _addWatchMeasures(watchMeasures);
                edr = _analyzeEdrForMeasure(measureLog, digestDetails.highlights.edr, digestDetails.measures, lastDigestMeasure);
                digestDetails.highlights.edr = edr;
                if (digestDetails.highlights.longestDigestTime < measureLog.runtime) {
                    digestDetails.highlights.longestDigestTime = measureLog.runtime;
                }
                // count watchers in digest max of dirty/total
                if (digestDetails.highlights.dirtyWatchers < measureLog.nDirtyWatchers) {
                    digestDetails.highlights.dirtyWatchers = measureLog.nDirtyWatchers;
                }
                if (digestDetails.highlights.nWatchers < measureLog.nWatchers) {
                    digestDetails.highlights.nWatchers = measureLog.nWatchers;
                }
                lastDigestMeasure = measureLog;
            };

            getAllDigestMeasures = function () {
                return digestDetails;
            };

            modifyDigestDebounceTime = function (newDebounceTime) {
                digestDebounceTime = newDebounceTime;
                // re-analyze edr
                var edr, measures = [], lastMeasure, len = digestDetails.measures.length;

                while (len--) {
                    edr = _analyzeEdrForMeasure(digestDetails.measures[len], edr, measures, lastMeasure);
                    lastMeasure = digestDetails.measures[len];
                }
                digestDetails.highlights.edr = edr;
            };

            getDigestDebounceTime = function () {
                return digestDebounceTime;
            };

            resetDigestMeasures = function () {
                if (!digestDetails) {
                    digestDetails = {
                        measures: []
                    };
                }
                digestDetails.highlights = {
                    longestDigestTime: 0,
                    edr: null,
                    dirtyWatchers: 0,
                    nWatchers: 0,
                    //qq: NEEL find out how can i determine ? ex. watch consumes 80% of digest in longest cycle time. watch are heavy, expensive.
                    redLightWatchMsg: ''
                };
                digestDetails.measures.length = 0;
                allApplyMeasures.length = 0;
                watchDetails.measures.length = 0;
                watchDetails.highlights = {};
            };

            return {
                'addDigestMeasure': addDigestMeasure,
                'resetDigestMeasures': resetDigestMeasures,
                'getAllDigestMeasures': getAllDigestMeasures,
                'modifyDigestDebounceTime': modifyDigestDebounceTime,
                'getDigestDebounceTime': getDigestDebounceTime
            };

        }]);

}(angular));