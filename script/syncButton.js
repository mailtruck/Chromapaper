var syncFailed = false;
var url_exists = new Boolean();
var syncButtonOn;

/*
       +--------------------+
-------|   Page Functions   |------------------------------------------------------------------------------------------
       +--------------------+
*/

if (location.host == "www.instapaper.com") {
	switch (location.pathname.split('/')[1]) {
		case "u":
			chrome.extension.sendRequest({method: "getSyncButtonOption"}, function(response) {
					syncButtonOn = response.status;
					if (!syncButtonOn) {
						syncButtonOn = "true";
					}
					addOptions(true);
				}
			);
			break;
		case "browse":
		case "starred":
		case "archive":
		case "extras":
		case "user":
			addOptions(false);
			break;
	}
}

function addOptions(sync) {

	headerDiv = document.getElementById("header");
	lowerDiv = document.getElementsByTagName("div").item(2);
	
	chromeDiv = document.createElement("div");
	chromeDiv.style.cssFloat = "right";
	
	lowerDiv.appendChild(chromeDiv);
	
	label = document.createElement("span");
	label.innerHTML = "Chromapaper: "
	
	optionsLink = document.createElement("a");
	optionsLink.setAttribute("href",chrome.extension.getURL("options.html"));
	optionsLink.innerHTML = "Options";
	
	newBullet = document.createElement("span");
	newBullet.setAttribute("style","color: #ccc");
	newBullet.innerHTML = " &bull; ";
	
	chromeDiv.appendChild(label);
	chromeDiv.appendChild(optionsLink);
	
	console.log(sync);
	console.log(syncButtonOn);
	
	if (sync == true && syncButtonOn == "true") {
		chromeDiv.appendChild(newBullet);
	
		syncLink = document.createElement("a");
		syncLink.setAttribute("href",chrome.extension.getURL("sync.html"));
		syncLink.innerHTML = "Offline Sync";
		
		chromeDiv.appendChild(syncLink);
	}
}

String.prototype.startsWith = function(str){
	return (this.indexOf(str) === 0);
}
