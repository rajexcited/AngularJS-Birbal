(function (window, document) {
	'use strict';

	/**
		To include HTML file into DOM element using special attribute
		attribute :  data-include-html

		ex.   <div data-include-html="htmlURL" >HTML will be added here.</div>

	*/
	var INCLUDE_HTML_ATTR = 'data-include-html',
		INCLUDE_HTML_DATA = 'includeHtml',
		CHILDLIST = 'childList',
		INCLUDE_HTML_ATTR_FIND = '[' + INCLUDE_HTML_ATTR + ']';

	function loadHtml(element) {
		try {
			element = element instanceof HTMLElement ? $(element) : element;
			var src = element.data(INCLUDE_HTML_DATA);
			if (src) {
				element.data('includeStatus', 'started');
				var htmlCaller = element.data();
				$(htmlCaller).load(src, function (responseText, textStatus, jqXHR) {
					element.data('includeStatus', textStatus);
					$(responseText).render(element.data()).appendTo(element);
					element.trigger('afterload', textStatus);
				});
			}
		} catch (e) {
			// log error
			console.error(e);
		}
	}

	function childHtmlInclude(elements) {
		var childrenToInclude = $(elements).find(INCLUDE_HTML_ATTR_FIND);
		childrenToInclude.each(function (index, element) {
			loadHtml(element);
		});
	}

	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

	var observer = new MutationObserver(function (mutations) {
		// fired when a mutation occurs
		mutations.forEach(function callback(mutation) {

			if (mutation.type === CHILDLIST) {
				// child added or removed
				childHtmlInclude(mutation.addedNodes);
			} else {
				// mutation type is attribute
				loadHtml(mutation.target);
			}

		});
	});

	observer.observe(document, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: [INCLUDE_HTML_ATTR]
	});

	childHtmlInclude(document);

})(window, document);
