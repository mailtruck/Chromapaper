/*
SYNC.JS REWRITE PROJECT

b. For each page -
	- Compare to the pages saved (CheckPage)
	-
Split into several namespaces to cut down on globals:
	instapaperScraper.*:
		.urls - scrapes & returns all the urls on the page
		.details
	
	pageScraper.*:
		
		
	dbCallbacks.*:
		
	overlays.*:	
		.sync
		.noPages
		.notLoggedIn
*/


/*

Options

Contains the options taken from localStorage.

save_images_option - should images be saved or not? Defaults false. 
folders_to_sync - comma-separate list of ids of folders to be synced. Eventually will be replaced by an SQL table.

*/

var options = new function() {
	var save_images_option = localStorage['saveImagesOn']
	if (!save_images_option) {
		save_images_option = "false";
	}

	var folders_to_sync = localStorage['folders'];
	console.log(folders_to_sync);
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
		//overlay.sync();

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

		//archiveDB.start();
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
			archivesDB.start();
		}
		else if (this.url_check_done == true && this.saves_done == true && this.archives_done == true && this.images_done == true && this.status == "ok") {
			console.log("all done!!");
		}
	}
}

/*

saveDB handles looping through the scraped URLs and discarding or downloading + saving each.

start - called to begin process

*/

var saveDB = new function() {
	this.pages_to_save = new Array();
	
	var status = 'continue';
	
	this.start = function() {
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
						console.log("hey hit the last one!!");
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
				function () {console.log("saved page");},
				database.onError);
		});
	};
	var scrapePages = function (pages_to_save) {
		for (i in pages_to_save) {
			page = pages_to_save[i];

			page.html = scrapePage(page.url);

			if (page.html == "400") {
				//overlay.sync.failed.400
				syncProgress.saves_done = true;
				syncProgress.status = "400";
				syncProgress.check();
				return;
			}

			savePage(page);
			console.log(page);
			//overlay.sync.savedPage(page)
		}
		if (i == (pages_to_save.length - 1)) {
			console.log("hey hit the page to save!!");
			syncProgress.saves_done = true;
			syncProgress.check();
		}
	};
}


/* 

archiveDB, as the name implies, handles archiving.

It's called by the syncProgress.check() at the end of the saveDB path.

*/


var archiveDB = new function() {
	this.pages_to_archive = new Array();

	this.start = function () {
		
	}
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
			console.log(status);
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
		console.log(url);
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
			console.log("all done!");
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



function scrapePage(url) {
	var scraper = new XMLHttpRequest();
	try {
		scraper.open("GET", "http://www.instapaper.com" + url, false);
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
	/*
	//Need to remove the script part of the html doc so that we can parse it correctly.
	scriptStartPos = scraperString.search("<script");
	scriptEndPos = scraperString.search("</script");
	
	imageScraperString = scraper.responseText.substring(0,scriptStartPos) + scraper.responseText.substring(scriptEndPos+9);
	imageScraperString = imageScraperString.replace(/&/gi, "&amp;");
	
	parser = new DOMParser();
	scraperParser = parser.parseFromString(imageScraperString,"text/xml");
	
	if (saveImagesOption == "true") {
		scrapeImages(id,url,scraperParser);
	}
	*/
	return html;
}