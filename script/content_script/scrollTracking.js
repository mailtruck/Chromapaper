//this file is ONLY for use on non-paginated articles!

var online = false;
var scrollTrackingSetting = "false";
var scrollTimer;

//coming from online
if (location.host == "www.instapaper.com") {
	switch (location.pathname.split('/')[1]) {
		case "text":
		case "go":
			chrome.extension.sendRequest({method: "getPaginationOnlineOption"}, function(response) {
				paginationSetting = response.status;
				if (!paginationSetting) {
					paginationSetting = "false";
				}
				online = true;
				if (paginationSetting == "false") {
					chrome.extension.sendRequest({method: "getScrollTrackingOption"}, function(response) {
						scrollTrackingSetting = response.status;
						if (scrollTrackingSetting == "true") {
							scrollTracking();
						}
					});	
				}
			});
			break;
	}
}

//coming from offline
if (location.protocol == "chrome-extension:") {
	chrome.extension.sendRequest({method: "getPaginationOption"}, function(response) {
		paginationSetting = response.status;
		if (!paginationSetting) {
			paginationSetting = "false";
		}
		online = false;
		if (paginationSetting == "false") {
			chrome.extension.sendRequest({method: "getScrollTrackingOption"}, function(response) {
				scrollTrackingSetting = response.status;
				if (scrollTrackingSetting == "true") {
					scrollTracking();
				}
			});	
		}
	});
}

function scrollTracking() {
	if (online == false) {
		scrollPositionStorage = "scrollPosition" + location.search;
	}
	if (online == true) {
		scrollPositionStorage = "scrollPosition" + location.pathname;
	}
	loadScroll();
	window.onscroll = updateScroll;
}

function loadScroll() {
	if (!localStorage[scrollPositionStorage]) {
		localStorage[scrollPositionStorage] = 0;
	}
	else {
		
		document.body.scrollTop = localStorage[scrollPositionStorage];
	}
}

function updateScroll() {
	localStorage[scrollPositionStorage] = document.body.scrollTop;
}