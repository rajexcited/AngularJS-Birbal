(function (chrome) {
	'use strict';

	console.log('devtoolsPage.js is loading.');
	/////////////////////////////////////////////////////////
	//            Create Panel
	/////////////////////////////////////////////////////////
	chrome.devtools.panels.create(
		'Angular Birbal',
		null, // No icon path
		'src/devtools/panel/starter.html',
		null // no callback needed
	);

})(chrome);
