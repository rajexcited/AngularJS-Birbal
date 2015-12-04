/*global chrome, birbalJS, require*/
(function (chrome, birbalJS) {
    'use strict';

    var $ = require('jquery');
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
    //      Inspected tab eval to avoid communication
    /////////////////////////////////////////////////////////
    // use birbalJS to allow panel tab or view to perform any actions on inspected window or tab.
    var actionEvalMap = {};
    actionEvalMap.reload = function () {
        window.location.reload();
    };

    birbalJS.pageAction = function (_action) {
        if (typeof actionEvalMap[_action] === 'function') {
            var args = Array.prototype.map.call(arguments, function (a) {
                return a;
            }).slice(1);
            chrome.devtools.inspectedWindow.eval('(' +
                actionEvalMap[_action].toString() +
                '(window, ' +
                JSON.stringify(args) +
                '));');
        }
    };

    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////

}(chrome, birbalJS));
