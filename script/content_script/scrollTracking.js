//this file is ONLY for use on non-paginated articles!

var online = false;
var scrollTrackingSetting = "false";
var scrollTimer;

//document.write('<script type="text/javascript" src="' + chrome.extension.getURL('script/includes/options.js') + '"></scr' + 'ipt>'); 

//coming from online
if (location.host == "www.instapaper.com") {
	switch (location.pathname.split('/')[1]) {
		case "text":
		case "go":
			
			online = true;
			checkScrollTracking();
			break;
	}
}

//coming from offline
if (location.protocol == "chrome-extension:") {
	online = false;
	checkScrollTracking();
}

function checkScrollTracking() {
	chrome.extension.sendRequest({method: "getOption", option:'scrollTrackingOn'}, function(response) {
		scrollTrackingSetting = response.status;
		if (scrollTrackingSetting == "true") {
			scrollTracking();
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