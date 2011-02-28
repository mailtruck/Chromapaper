var debug = true; //disables the redirect from chromapaper icon->instapaper.com when online
var online = false;

function renderList(tx,results) {
	if (results.rows.length == 0) {
		noArticlesOverlayOffline();
	}
	var i;
	var list=document.getElementById("bookmark_list");
	
	var newHTML = new String();
	
	rows = results.rows.length - 1
	
	if (results.rows.length > 0) {
		for (i = 0; i <= rows; i++) {
			console.log("looping!!");
			id = i+1
			
			if (results.rows.item(i).article_title != "") {
				title = results.rows.item(i).article_title;
			}
			else {
				title = "[encoding error, article name could not be retrieved!]";
			}
			
			HTMLEnd = "onClick='window.location=\"read.html?id=" + results.rows.item(i).id + "\"' onMouseOver='style.cursor=\"pointer\";this.style.backgroundColor = \"#eee\";' onMouseOut='this.style.backgroundColor = \"#F8F8F8\"'>";
			
			if (i == 0) {
				newHTML += "<div class='tableViewCell tableViewCellFirst'" + HTMLEnd;
			}
			else if (i == rows) {
				newHTML += "<div class='tableViewCell tableViewCellLast'" + HTMLEnd;
			}
			else {
				newHTML += "<div class='tableViewCell'" + HTMLEnd;
			}
			newHTML = newHTML + "<div class='cornerControls'></div><div class='starBox'></div>"
			newHTML = newHTML + "<div class='titleRow'>";

			newHTML = newHTML + "<a class='tableViewCellTitleLink' href='read.html?id=" + results.rows.item(i).id + "'>" + title + "</a>";
			
			if (results.rows.item(i).description != "\n                                                    " && results.rows.item(i).description != null) {
				newHTML += "<div class='summary'>" + results.rows.item(i).description + "</div>";
			}
			
			newHTML = newHTML + "</div><div class='clear'></div></div></div>";
		}
		list.innerHTML = newHTML;
	}
}

function noArticlesOverlayOffline() {
	html = "<div id='overlayHeader'>No pages!</div><div id='overlayText'>You have no pages in your offline list. Sync at Instapaper.com when you are online.</div>"
	renderOverlay(html);
}

function renderOverlay(html) {
	//overlay the body with grey
	var overlay = document.createElement("div");
	overlay.setAttribute("id","overlay");
	overlay.setAttribute("class", "overlay");
	
	document.body.appendChild(overlay);
	
	//create text box
	var textBox = document.createElement("div");
	textBox.setAttribute("id","overlayContents");
	textBox.innerHTML = html;
	document.body.appendChild(textBox);
}

function removeOverlay() {
	document.body.removeChild(document.getElementById("overlay"));
	document.body.removeChild(document.getElementById("overlayContents"));
}

database.setup();
function pagesLoaded() {
	database.list();
}
