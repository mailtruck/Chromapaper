//note to anyone who stumbles on this: yeah, it's pretty messy. A cleanup is on my todo list :)

var debug = true;
var online = false;

//options - rememeber, even "booleans" are just strings in localStorage!

var pages = {
	setup: function() {	
		pages.db = openDatabase('instapaper_reader', '1.0', 'Instapaper Articles', 1024 * 1024);
		pages.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
				"pages(id integer primary key asc, article_title string, url string, html string, available boolean, description string, images string)",
				[],
				function() {console.log("Created/connected to DB");}
				);
		});
	},
	list: function() {
		pages.db.transaction(function(tx) {
			tx.executeSql(
				"select * from pages order by id desc",
				[],
				renderList,
				pages.onError);
		});
	},
	onError: function(tx,error) {
		console.log("Error occured: ", error.message);
	}
};

function testOnline() {
	var pingTest = new XMLHttpRequest();
	try {
		pingTest.open("HEAD", "http://www.instapaper.com/", false);
		pingTest.send();
	}
	catch(err) {
		console.log("Error description: " + err.description);
	}
	if (pingTest.status == 200) {
		online = true;
	}
	if (online == true && debug==false) {
		location.replace("http://www.instapaper.com/u/");
	}
}

function renderList(tx,results) {
	if (results.rows.length == 0) {
		if (online == false || debug == true) {
			noArticlesOverlayOffline();
		}
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

function renderMainHTML() {
	//YES this totally blows. Doing this so it doesn't render everything before redirecting. Looks nicer. Goddamn I hate editing it though.
	document.getElementById("container").innerHTML = '<div id="header"><div id="userpanel"><a href="options.html">Options</a></div><h1 id="logo"><span class="logo">Chromapaper</a></h1><div style="font-size: 14px; margin-top: 8px;">A simple tool to save web pages for reading later.</div> </div><div id="bookmark_list"><!-- here will be pages --></div><div id="footer"> <script type="text/javascript">renderDebugOptions();</script><div style="margin-top:1em;">Unofficial Chrome app by <a href="http://thomas.mream.net">Thomas</a> | Instapaper &copy;&nbsp;2010 Instapaper, LLC.</div> </div> ';
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


testOnline();

if (online == true && debug==false) {
	//do nothing
}
else {
	if (document.addEventListener) {
		document.addEventListener("DOMContentLoaded", renderMainHTML, false);
	}

	pages.setup();
	pages.list();
}