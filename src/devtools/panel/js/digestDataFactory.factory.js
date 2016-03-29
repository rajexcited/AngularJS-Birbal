/**
 * Created by Neel on 3/16/2016.
 */

/*global angular*/
(function (angular) {
    "use strict";

    angular.module('measure.digest.app', [])
        .factory('digestDataFactory', [function () {

            var addDigestMeasure, getAllDigestMeasures, modifyDigestDebounceTime, getDigestDebounceTime, resetDigestMeasures, getWatchMeasures, getDigestHighlightsForRange,
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
                angular.forEach(oneDigestMeasure.scope, function (scope, id) {
                    // find watchers
                    nScopes++;

                    function eachScopeWatcher(oneWatcher) {
                        if (!oneWatcher) {
                            return;
                        }

                        function eachWatcherGet(oneWatchGetter) {
                            var gettime = (typeof oneWatchGetter === 'object') ? oneWatchGetter.get : oneWatchGetter;
                            nuWatcher.timeGet = nuWatcher.timeGet + gettime;
                            // !! converts to true for any non-zero value
                            if (oneWatchGetter.fn !== undefined) {
                                nuWatcher.timeFn = nuWatcher.timeFn + oneWatchGetter.fn;
                                nuWatcher.nFn++;
                                nuWatcher.wasteOnGetOnly = false;
                            }
                        }

                        nuWatcher = {
                            'nGet': 0,
                            'timeGet': 0,
                            'nFn': 0,
                            'timeFn': 0,
                            'exp': '',
                            'eq': oneWatcher[0].eq,
                            'wasteOnGetOnly': true,
                            'runtime': 0,
                            'scope': id
                        };
                        var len;
                        len = nuWatcher.nGet = oneWatcher.length;
                        // to convert back to simple string literal
                        nuWatcher.exp = JSON.parse(oneWatcher[0].exp);
                        // first and last always object with get and fn

                        while (len--) {
                            eachWatcherGet(oneWatcher[len]);
                        }
                        nuWatcher.runtime = nuWatcher.timeGet + nuWatcher.timeFn;
                        if (nuWatcher.wasteOnGetOnly) {
                            ++nWasteWatchers;
                            nWasteWatchersTime = nWasteWatchersTime + nuWatcher.runtime;
                        }
                        nWatchersTime = nWatchersTime + nuWatcher.runtime;
                        _watchers.push(nuWatcher);
                    }

                    _watchers = [];
                    var iscw, scwlen = scope.watchers.length;
                    for (iscw = 0; iscw < scwlen; iscw++) {
                        eachScopeWatcher(scope.watchers[iscw]);
                    }
                    nWatchers = nWatchers + _watchers.length;
                    scope.watchers = _watchers;
                    // generate scope tree - no need
                });
                oneDigestMeasure.nWatchers = nWatchers;
                oneDigestMeasure.nDirtyWatchers = nWatchers - nWasteWatchers;
                oneDigestMeasure.nScopes = nScopes;
                oneDigestMeasure.nWatchersRuntime = nWatchersTime;
                oneDigestMeasure.nWasteWatchersTime = nWasteWatchersTime;
            };

            /**
             * get all watchers from given digest cycle
             * @param {object} digestMeasure one digest cycle details
             * @returns {Array} all watchers of digest
             * @private
             */
            _createWatchMeasures = function (digestMeasure) {
                var scwexp,
                    wexp = [],
                    watchHolder = [];
                // iterate scope watchers
                // get exp for scope watchers
                // find duplicate exp and merge them
                // no duplicate - add to new list

                function mergeWatchByExpression(wex, watcherToAdd) {
                    var fst = wexp.indexOf(wex),
                        lst = wexp.lastIndexOf(wex),
                        existedWatch;

                    // find out eligibility of fst or lst to merge due to eq property
                    if ((fst !== -1 && watchHolder[fst].eq === watcherToAdd.eq) === false) {
                        // fst not eligible
                        // after verifying lst state - assign to fst to merge
                        fst = (lst !== -1 && watchHolder[lst].eq === watcherToAdd.eq) !== false && lst;
                    }
                    watcherToAdd.nUsed = watcherToAdd.scope.split(',').length;
                    if (fst === false) {
                        wexp.push(wex);
                        watchHolder.push(angular.copy(watcherToAdd));
                    } else {
                        // merge - exp, eq are same for merger
                        existedWatch = watchHolder[fst];
                        existedWatch.nGet = existedWatch.nGet + watcherToAdd.nGet;
                        existedWatch.nFn = existedWatch.nFn + watcherToAdd.nFn;
                        existedWatch.timeGet = existedWatch.timeGet + watcherToAdd.timeGet;
                        existedWatch.timeFn = existedWatch.timeFn + watcherToAdd.timeFn;
                        existedWatch.runtime = existedWatch.runtime + watcherToAdd.runtime;
                        existedWatch.wasteOnGetOnly = existedWatch.wasteOnGetOnly && watcherToAdd.wasteOnGetOnly;
                        existedWatch.scope = existedWatch.scope + ',' + watcherToAdd.scope;
                        existedWatch.nUsed = existedWatch.nUsed + watcherToAdd.nUsed;
                    }
                }

                angular.forEach(digestMeasure.scope, function (scope) {
                    scwexp = scope.watchers.map(function (w) {
                        return w.exp;
                    });
                    var i, len = scwexp.length;
                    for (i = 0; i < len; i++) {
                        mergeWatchByExpression(scwexp[i], scope.watchers[i]);
                    }
                });

                return watchHolder;
            };

            _addWatchMeasures = function (watchMeasures) {
                // find duplicates in 2 array and merge
                // here exp1 has unique items as well as exp2
                // merging both can generate duplicates

                var i, len,
                    detailWatchMeasures = watchDetails.measures,
                    exp = detailWatchMeasures.map(function (w) {
                        return w.exp;
                    }),
                    expdw = watchMeasures.map(function (w) {
                        return w.exp;
                    });

                // duplication possibilities - merge to detailWatchMeasures
                function mergeWatchByExpression(w, ind) {
                    var fst = exp.indexOf(w),
                        lst = exp.lastIndexOf(w),
                        wmd = watchMeasures[ind],
                        wm;

                    // find out eligibility of fst or lst to merge due to eq property
                    if ((fst !== -1 && detailWatchMeasures[fst].eq === wmd.eq) === false) {
                        // fst not eligible
                        // after verifying lst state - assign to fst to merge
                        fst = (lst !== -1 && detailWatchMeasures[lst].eq === wmd.eq) !== false && lst;
                    }

                    if (fst === false) {
                        wmd.nUsedMax = wmd.nUsed;
                        detailWatchMeasures.push(wmd);
                    } else {
                        // merge - exp and eq are same for merger
                        wm = detailWatchMeasures[fst];
                        wm.nGet = wm.nGet + wmd.nGet;
                        wm.nFn = wm.nFn + wmd.nFn;
                        wm.timeGet = wm.timeGet + wmd.timeGet;
                        wm.timeFn = wm.timeFn + wmd.timeFn;
                        wm.runtime = wm.runtime + wmd.runtime;
                        wm.wasteOnGetOnly = wm.wasteOnGetOnly && wmd.wasteOnGetOnly;
                        wm.scope = wm.scope + ',' + wmd.scope;
                        wm.nUsedMax = (wm.nUsedMax > wmd.nUsed && wm.nUsed) || wmd.nUsed;
                        wm.nUsed = wm.nUsed + wmd.nUsed;
                    }
                }

                if (exp.length === 0) {
                    // first time only - add all watchMeasures to detail
                    Array.prototype.push.apply(detailWatchMeasures, watchMeasures);
                } else {
                    // iterate expdw
                    len = expdw.length;
                    for (i = 0; i < len; i++) {
                        mergeWatchByExpression(expdw[i], i);
                    }
                }
            };

            // create summary for digest
            _analyzeEdrForMeasure = function (aMeasure, edr, measures, lastDigestMeasure) {
                // edr = effective digest rate, calculated using digest debounce time
                var mPrev, m, dmlen, nuedr;
                dmlen = measures.length;

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
                // watchers
                _getScopesAndWatchersForOneDigest(measureLog);
                watchMeasures = _createWatchMeasures(measureLog);
                _addWatchMeasures(watchMeasures);
                measureLog.otherRuntime = measureLog.runtime - measureLog.nWatchersRuntime;
                // postDigest, and nothing for asyncQueue
                if (measureLog.postDigestQueue) {
                    measureLog.postDigestQueue = JSON.parse(measureLog.postDigestQueue);
                }
                // do nothing for emit and broadcast events
                // do nothing on error message for uncompleted digest cycle
                edr = _analyzeEdrForMeasure(measureLog, digestDetails.highlights.edr, digestDetails.measures, lastDigestMeasure);
                digestDetails.highlights.edr = edr;
                measureLog.index = digestDetails.measures.length;
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
                if(newDebounceTime===digestDebounceTime) {
                    return;
                }
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


            getWatchMeasures = function () {
                return watchDetails;
            };

            getDigestHighlightsForRange = function (timeFrom, timeTo) {
                var highlights = {
                        longestDigestTime: 0,
                        edr: null,
                        dirtyWatchers: 0,
                        nWatchers: 0,
                        from: 0,
                        to: 0,
                        //qq: NEEL find out how can i determine ? ex. watch consumes 80% of digest in longest cycle time. watch are heavy, expensive.
                        redLightWatchMsg: ''
                    },
                    measures = [],
                    lastMeasure,
                    len = digestDetails.measures.length,
                    m,
                    toInd = -1,
                    fromInd = -1;


                while (len--) {
                    m = digestDetails.measures[len];
                    if (toInd === -1) {
                        if (Math.round(m.endTime / 1000) > timeTo) {
                            continue;
                        }
                        toInd = len;
                    }
                    if (Math.round(m.startTime / 1000) < timeFrom) {
                        break;
                    }

                    highlights.edr = _analyzeEdrForMeasure(m, highlights.edr, measures, lastMeasure);
                    lastMeasure = digestDetails.measures[len];
                    if (highlights.longestDigestTime < lastMeasure.runtime) {
                        highlights.longestDigestTime = lastMeasure.runtime;
                    }
                    // count watchers in digest max of dirty/total
                    if (highlights.dirtyWatchers < lastMeasure.nDirtyWatchers) {
                        highlights.dirtyWatchers = lastMeasure.nDirtyWatchers;
                    }
                    if (highlights.nWatchers < lastMeasure.nWatchers) {
                        highlights.nWatchers = lastMeasure.nWatchers;
                    }
                }
                highlights.to = toInd !== -1 ? toInd : len;
                highlights.from = (Math.round(m.endTime / 1000) < timeFrom || len === -1) ? len + 1 : len;

                return highlights;
            };

            return {
                'addDigestMeasure': addDigestMeasure,
                'resetDigestMeasures': resetDigestMeasures,
                'getAllDigestMeasures': getAllDigestMeasures,
                'modifyDigestDebounceTime': modifyDigestDebounceTime,
                'getDigestDebounceTime': getDigestDebounceTime,
                'getWatchMeasures': getWatchMeasures,
                'getDigestHighlightsForRange': getDigestHighlightsForRange
            };

        }]);

}(angular));