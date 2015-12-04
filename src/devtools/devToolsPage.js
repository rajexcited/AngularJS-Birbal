/*global chrome*/
(function (chrome) {
    'use strict';

    window.console.log('devtoolsPage.js is loading.');
    /////////////////////////////////////////////////////////
    //            Create Panel
    /////////////////////////////////////////////////////////
    chrome.devtools.panels.create(
        'Angular Birbal',
        null, // No icon path
        '/src/devtools/panel/partials/index.html',
        null // no callback needed
    );

})(chrome);
