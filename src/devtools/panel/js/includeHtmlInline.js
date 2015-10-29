(function (window, document) {
	'use strict';

	/**
		To include HTML file into DOM element using special attribute
		attribute :  data-include-html

		ex.   <div data-include-html="htmlURL" >HTML will be added here.</div>

		render template with element data by adding / updating attribute
		NOTE: if template is same but data changed, update attribute with same template url to render
	*/
	var INCLUDE_HTML_ATTR = 'data-include-html',
		INCLUDE_HTML_DATA = 'includeHtml',
		CHILDLIST = 'childList',
		INCLUDE_HTML_ATTR_FIND = '[' + INCLUDE_HTML_ATTR + ']';

	function loadHtml(element) {
		try {
			element = element instanceof HTMLElement ? $(element) : element;
			var src = element.attr(INCLUDE_HTML_ATTR);
			var templatesrc = src;
			if (src) {
				element.data('includeStatus', 'started');
				templatesrc = {
					src: src
				};
				$(templatesrc).load(src, function (responseText, textStatus, jqXHR) {
					element.data('includeStatus', textStatus);
					$.templates[templatesrc] = jQuery.tmpl(responseText);

					element.html($(templatesrc).render(element.data()));
					element.trigger('afterload', {
						status: textStatus,
						src: src
					});
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
