/*
SYNC.JS REWRITE PROJECT
*/


/*

Options

Contains the options taken from localStorage.

save_images_option - should images be saved or not? Defaults false. 
folders_to_sync - comma-separate list of ids of folders to be synced. Eventually will be replaced by an SQL table.

*/

var options = new function() {
	var save_images = localStorage['saveImagesOn']
	if (!save_images) {
		save_images = "false";
	}

	var folders_to_sync = localStorage['folders'];
	if (folders_to_sync) {
		this.folders_to_sync = folders_to_sync.split(','); //gahhhhh
	}
	else {
		this.folders_to_sync = ""
	}
}

/*

Sync

start() - Scrapes instapaper's pages for list of pages
urls - list of urls
details - list of details

*/

var sync = new function() {
	
	this.start = function() {
		overlay.start();

		this.pages = instapaperScraper.getListHtml();
		if (this.pages == "no pages saved") {
			overlay.noPages();
			return;
		}
		else if (this.pages == "not logged in") {
			overlay.notLoggedIn();
			return;
		}
		this.urls = instapaperScraper.getUrls(this.pages);
		this.details = instapaperScraper.getDetails(this.pages);
		
		saveDB.start();
	};
	
}

database.setup();
function pagesLoaded() {
	sync.start();
}

/*

syncProgress

Contains variables that measure the progress of the sync, to help keep track of all the asynchronous stuff going on.

check() - checks to see if we're all done.

*/

var syncProgress = new function() {
	this.url_check_done = false;
	this.saves_done = false;
	this.archives_done = false;
	this.images_done = false;
	this.status = "ok"; //values: "ok", "400"
	
	this.check = function() {
		if (this.url_check_done == true && this.saves_done == true &&  this.archives_done == false) {
			archiveDB.start();
		}
		else if (this.url_check_done == true && this.saves_done == true && this.archives_done == true && this.status == "ok") {
			overlay.success();
			console.log("all done!!");
		}
		else if (this.status == '400') {
			overlay.error400();
		}
	}
}

/*

saveDB handles looping through the scraped URLs and discarding or downloading + saving each.

start - called to begin process

*/

var saveDB = new function() {
	this.pages_to_save = new Array();
	this.pages_saved_num = 0;

	var status = 'continue';
	
	this.start = function() {
		overlay.scrapingStarted();
		for (i in sync.urls) {
			//this basically queues each query to be acted on once the loop is complete...
			checkIn(i);
		}
	};
	var checkIn = function (i) {
		database.db.transaction(function(tx) {
			tx.executeSql("select * from pages where url=?",
				[sync.urls[i]],
				function (tx, results) {
					if (results.rows.length == 0) {

						var page = {
							url: sync.urls[i],
							description: sync.details[i].description,
							title: sync.details[i].title,
							id: i
						}
						saveDB.pages_to_save.push(page);
					}
					if (i == (sync.urls.length - 1)) {
						if (saveDB.pages_to_save.length == 0) {
							syncProgress.saves_done = true;
							syncProgress.url_check_done = true;
							syncProgress.check();
						}
						syncProgress.url_check_done = true;
						scrapePages(saveDB.pages_to_save);
					}
				},
				database.onError
			);
		});
	};

	var savePage = function (page) {
		
		database.db.transaction(function(tx) {
			tx.executeSql("insert into pages (article_title, url, html, available, description) values (?, ?, ?, 'true', ?);",
				[page.title, page.url, page.html, page.description],
				function () {
					if (saveDB.pages_saved_num == (saveDB.pages_to_save.length - 1)) {
						syncProgress.saves_done = true;
						syncProgress.check();
					}
					saveDB.pages_saved_num++
				},
				database.onError);
		});
	};
	var scrapePages = function (pages_to_save) {

		for (i in saveDB.pages_to_save) {
			page = saveDB.pages_to_save[i];

			page.html = scrapePage(page);

			if (page.html == "400") {
				syncProgress.saves_done = true;
				syncProgress.status = "400";
				syncProgress.check();
				return;
			}

			savePage(page);

		}
		
	};
	this.saveImage = function(id, url, src, imageBlob) {
		database.db.transaction(function(tx) {
			tx.executeSql(
				"INSERT INTO images (id, url, src, data) values (?, ?, ?, ?)",
				[id, url, src, imageBlob],
				function (tx,results) {
					console.log("saved image " + src);
				},
				database.onError);
		});
	};
}


/* 

archiveDB, as the name implies, handles archiving.

It's called by the syncProgress.check() at the end of the saveDB path.

*/


var archiveDB = new function() {
	this.pages_to_archive = new Array();

	this.start = function () {
		database.db.transaction(function(tx) {
			tx.executeSql(
				"select * from pages",
				[],
				function (tx, results) {
					overlay.archivingStarted();
					for (i=0;i < results.rows.length; i++) {
						var page_found = false;
						for (i2 in sync.urls) {
							if (sync.urls[i2] == results.rows.item(i).url) {
								page_found = true;
							}
						}
						if (page_found == false) {
							archiveDB.pages_to_archive.push(results.rows.item(i));
						}
						
					}
					i = 0; //might not need
					if (archiveDB.pages_to_archive.length > 0) {
						for (i in archiveDB.pages_to_archive) {
							remove(archiveDB.pages_to_archive[i], i);
						}
					}
					else {
						syncProgress.archives_done = true;
						syncProgress.check();
					}
				},
				database.onError
			)
		});
	};
	var remove = function(page, pages_saved) {
		database.db.transaction(function(tx) {
			tx.executeSql(
				"DELETE from pages where id=?",
				//"SELECT * from pages where id=?", 
				[page.id],
				function (tx, results) {
					if (pages_saved == (archiveDB.pages_to_archive.length - 1)) {
						syncProgress.archives_done = true;
						syncProgress.check();
					}
				},
				database.onError
			)
		}); 	
	}; 

}


/* ----------------------------------------------------------------------------- 

       Scraping Functions

   ----------------------------------------------------------------------------- */


/*

instapaperScraper handles scraping Instapaper's HTML for the URLs and details of each folder.

*/

var instapaperScraper = new function() {
	var instapaper_html = new Array();
	this.getListHtml = function() {
		var page_loop_counter = 1;
		
		var status = "continue";
		//loop this for each page
		 while (status == "continue") {
			status = scrapePage("http://www.instapaper.com/u/" + (instapaper_html.length + 1)); //this is a little weird... scrape page automatically adds it to instapaper_html, so we return the status to decide if we should keep looping
		}
		if (status != 'done') {
			return status; //means not logged in or no pages
		}		
	
		//todo: what if user has no articles in unread but has articles in folders??
	
		if (options.folders_to_sync != "") {
			for (i in options.folders_to_sync) {
				folderNum = options.folders_to_sync[i];
				page_loop_counter = 1;
			
				var status = "continue";
				while (status == "continue") {
					status = scrapePage("http://www.instapaper.com/u/folder/" + folderNum + "/fakename/" + page_loop_counter, false);
					page_loop_counter++;
				}
			}
		}
		
		return instapaper_html;
	}
	var scrapePage = function(url) {	
		var instapaper_page = new XMLHttpRequest();
		try {
			instapaper_page.open("GET", url, false);
			instapaper_page.send();
		}
		catch(err) {
			console.log("Error description: " + err);
		}
	
		var instapaper_page_html_string = new String();
		var instapaper_page_html_string = instapaper_page.responseText;
		
		if (instapaper_page_html_string.search("Log out") == -1) {
			console.log("ain't logged in bub");
			status = "not logged in";
		} 
		else if (instapaper_page_html_string.search("No articles saved.") != -1 && instapaper_html.length == 0) {
			console.log("ain't got no saved pages");
			status = "no pages saved";
		} 
		else if (instapaper_page_html_string.search("No articles saved.") != -1 || instapaper_page_html_string.search("No articles in this folder.") != -1) {
			//no pages saved *on this page* so we're done!
			status = "done";
		}
		else {
			status = "continue";
			instapaper_html.push(instapaper_page_html_string);                                    
		}
		return status;
	}
	this.getUrls = function(instapaper_html) {
		var instapaperURLs = new Array();

		var loop_counter = 1;
		var num_urls = 0;

		for (loop_counter in instapaper_html) {
			var instapaperPageStringUnescaped = instapaper_html[loop_counter];
			var instapaperPageString = instapaperPageStringUnescaped.replace(/&/gi, "&amp;");

			parser = new DOMParser();

			instapaperPage = parser.parseFromString(instapaperPageString,"text/xml");

			links = instapaperPage.getElementsByTagName("a");

			for (i=0;i<links.length;i++) {
				url = links[i].getAttribute("href");
				if (url.startsWith("/text") == true || url.startsWith("/go") == true) {
					instapaperURLs[num_urls] = url;
					num_urls++;
				}
			}
		}
		instapaperURLs.reverse();
		return instapaperURLs;
	}
	
	this.getDetails = function(instapaperPagesHTML) {
	
		//this array holds the details objects for each page
		var instapaperDetails = new Array();
		var num_details = 0;
		var loop_counter = 1;
	
		for (loop_counter in instapaperPagesHTML) {
		
			//escape out the html of the page so it parses right
			var instapaperPageStringUnescaped = instapaperPagesHTML[loop_counter];
			var instapaperPageString = instapaperPageStringUnescaped.replace(/&/gi, "&amp;");
		
			//validation issue
			instapaperPageString = instapaperPageString.replace("<br/<br/>","<br/><br/>")
		
			parser = new DOMParser();
			
			instapaperPage = parser.parseFromString(instapaperPageString,"text/xml");
			
			allDivs = instapaperPage.getElementsByTagName("div");
		
			//traverse until we find the bookmark list
			for (i=0;i<allDivs.length;i++) {
				if (allDivs[i].getAttribute("id") == "bookmark_list") {
					bookmark_list = allDivs[i];
				}
			}
		
			listDivs = bookmark_list.getElementsByTagName("div");
		
			//WHY IS THIS INCRIMENTED += 2? IT IS A MYSTERY. but it works. ugh, f this codebase
			//by the way this is probably the worst part of this remade sync script
			//for each item in the list
			for (i=0;i<listDivs.length;i += 2) {
				if (listDivs[i].getAttribute("class") != null) {
					if (listDivs[i].getAttribute("class").indexOf("tableViewCell") != 1) {
					
						var divUrls = listDivs[i].getElementsByTagName("a");

						//for each url in the div
						for (i2 = 0; i2<divUrls.length; i2++) {
							url = divUrls[i2].getAttribute("href");
							if (url.startsWith("/") == false && url.startsWith("#") == false && url != null) {
								instapaperDetails[num_details] = new Object();

								instapaperDetails[num_details].title = divUrls[i2].childNodes[0].nodeValue;
							
								var divDivs = listDivs[i].getElementsByTagName("div");//this is a hilarious name but it just means the divs within the div that we picked out oh gosh this is dumb
							
								for (i3=0;i3<divDivs.length;i3++) { //this is some inception-level looping right here
									if (divDivs[i3].getAttribute("class") == "summary") {
										instapaperDetails[num_details].description = divDivs[i3].childNodes[0].nodeValue;
									}
								}
								num_details++;
							}
						}
					}
				}
			}
		}
		
		instapaperDetails.reverse();
	
		return instapaperDetails;
	}
}



function scrapePage(page) {
	var scraper = new XMLHttpRequest();
	try {
		scraper.open("GET", "http://www.instapaper.com" + page.url, false);
		scraper.send();
	}
	catch(err) {
		console.log("Error description: " + err);
	}
	
	if (scraper.status == 400) {
		return "400";
	}
	
	scraperString = scraper.responseText;

	html = scraperString;
	
	//Need to remove the script part of the html doc so that we can parse it correctly.
	scriptStartPos = scraperString.search("<script");
	scriptEndPos = scraperString.search("</script");
	
	imageScraperString = scraper.responseText.substring(0,scriptStartPos) + scraper.responseText.substring(scriptEndPos+9);
	imageScraperString = imageScraperString.replace(/&/gi, "&amp;");
	
	parser = new DOMParser();
	scraperParser = parser.parseFromString(imageScraperString,"text/xml");
	
	if (options.save_images == "true") {
		scrapeImages(page.id,page.url,scraperParser);
	}
	
	return html;
}


function scrapeImages(oid,url,html) {
	id = parseInt(oid) + 1
	var images = html.getElementsByTagName("img");
	for (curImage = 0;curImage < images.length;curImage++) {
		imgSrc = images[curImage].getAttribute("src");
		
		var image = new XMLHttpRequest();
		image.open("GET",imgSrc,false);
		image.overrideMimeType('text/plain; charset=x-user-defined');
		image.send();
		
		blobEncoded = Base64.encodeBinary(image.responseText); 
		
		saveDB.saveImage(id, url, imgSrc, blobEncoded);
	}
}




/* Overlay functions */

var overlay = new function() {

	this.start = function() {
		html = "<div id='overlayHeader'>Syncing...</div><div id='overlayText'>Loading your Instapaper list...</div>";
		renderOverlay(html);
	};


	this.noArticles = function() {
		//removeOverlay();
		html = "<div id='overlayHeader'>No pages!</div><div id='overlayText'>You have no pages to be synced in your Instapaper list.</div>";
		updateOverlay(html);
	}
	this.loggedOut = function () {
		//removeOverlay();
		html = "<div id='overlayHeader'>You are logged out!</div><div id='overlayText'>You are either logged out or have lost your internet connection.</div>";
		updateOverlay(html);
	}

	this.scrapingStarted = function() {
		updateOverlay("<div id='overlayHeader'>Syncing...</div><div id='overlayText'>Downloading & saving pages...</div>");
	}
	this.archivingStarted = function() {
		updateOverlay("<div id='overlayHeader'>Syncing...</div><div id='overlayText'>Archiving pages...</div>")
	}
	//unused for now... doesn't update until last page. weird.

	/*this.pageDownloaded = function(page) {
		console.log("trying to render pageDownloaded for:");
		console.log(page);

		html = "<div id='overlayHeader'>Downloading...</div><div id='overlayText'>";
		html += '"' + page.title.substr(0,70);
		if (page.title.substr(0,50) != page.title) {
			html += '...';
		}
		html += '"</div>';
		updateOverlay(html);
	};
	this.pageSaved = function(page) {
		console.log("trying to render pageSaved for:");
		console.log(page);

		html = "<div id='overlayHeader'>Saving...</div><div id='overlayText'>";
		html += '"' + page.title.substr(0,70);
		if (page.title.substr(0,50) != page.title) {
			html += '...';
		}
		html += '"</div>';
		updateOverlay(html);
	};
	this.pageArchived = function(page) {
		console.log("trying to render pageArchived for:");
		console.log(page);

		html = "<div id='overlayHeader'>Archiving...</div><div id='overlayText'>";
		html += '"' + page.title.substr(0,70);
		if (page.title.substr(0,50) != page.title) {
			html += '...';
		}
		html += '"</div>';
		updateOverlay(html);
	};*/


	this.error400 = function() {
		html = "<div id='overlayHeader'>Syncing error 400</div><div id='overlayText'>Syncing was only partially successful. Please wait a few minutes and refresh to finish syncing. <a href='error400.html'>Why does this happen?</a></div>"
		updateOverlay(html);
	};
	this.success = function() {
		html = "<div id='overlayHeader'>Sync finished.</div><div id='overlayText'>Redirecting...</div>";
		updateOverlay(html);
		console.log("REDIRECT TRIGGERED");
		//setTimeout('redirectHome()',2000);
	};

	var redirectHome = function() {
		window.location = "http://www.instapaper.com";
	}
	var renderOverlay = function(html) {
		console.log('rendering ' + html)
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
	};
	var updateOverlay = function(html) {
		var textBox = document.getElementById('overlayContents')
		textBox.innerHTML = html;
	}
};