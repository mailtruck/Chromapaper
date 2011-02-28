/*
SYNC.JS REWRITE PROJECT

b. For each page -
	- Compare to the pages saved (CheckPage)
	-
Split into several namespaces to cut down on globals:
	instapaperScraper.*:
		.urls - scrapes & returns all the urls on the page
		.details
	
	articleScraper.*:
		
		
	dbCallbacks.*:
		
	overlays.*:	
		.sync
		.noArticles
		.notLoggedIn
*/

var sync = {
	var urls;
	var details;
	
	function start() {
		overlay.sync();

		urls = instapaperScraper.getUrls();
		if (urls == "no articles saved") {
			overlay.noArticles();
			return;
		}
		else if (urls == "not logged in") {
			overlay.notLoggedIn();
			return;
		}
		details = instapaperScraper.getDetails(urls);
		
		dbSync.start();
	}
	
}

database.setup();
function pagesLoaded() {
	sync.start();
}

/* dbSync
articles_to_save
articles_to_archive
articles_saved
articles_archived
images_to_save?

----synchronous
for each page
	check if saved-> call back saveArticle
----
save article */

var dbSync = {
	var articles_to_save;
	var articles_to_archive;
	
	var articles_saved;
	var articles_archived;
	
	var status = 'continue'
	
	function start() {
		for (url in sync.urls) {
			//this basically queues each query to be acted on once the loop is complete...
			while (dbSync.status == 'continue') {
				dbSync.checkIn(sync.urls[url]);
			}
		}
		
		dbSync.checkArchive();
	}
	
	
}


/* instapaperScraper

.getUrls() - scrapes every page and gets all of the urls
.getDetails() - 

*/

var instapaperScraper = {
	var instapaper_html = new Array();
	function getUrls() {
		var page_loop_counter = 1;
		
		var status = "continue";
		//loop this for each page
		for (page_loop_counter = 1; status == "continue"; page_loop_counter++) {
			status = instapaperScraper.scrapePage("http://instapaper.com/u/" + (instapaper_html.length + 1)); //this is a little weird... scrape page automatically adds it to instapaper_html, so we return the status to decide if we should keep looping
		}
		if (status != 'done') {
			return status; //means not logged in or no articles
		}		
	
	
		if (foldersToSync) {
			for (i in foldersToSync) {
				folderNum = foldersToSync[i];
				page_loop_counter = 1;
			
				status = "continue";
				while (status == "continue") {
					status = instapaperScraper.scrapePage("http://instapaper.com/u/folders" + folderNum + "/fakename/" + page_loop_counter, false);
					page_loop_counter++
				}
			}
		}
	
		return instapaper_html;
	}
	function scrapePage(url) {	
		var instapaperPage = new XMLHttpRequest();
		try {
			instapaperPage.open("GET", url, false);
			instapaperPage.send();
		}
		catch(err) {
			console.log("Error description: " + err.description);
		}
	
		var instapaper_page_html_string = instapaperPage.responseText;

		if (instapaper_page_html_string.search("Log out") == -1) {
			status = "not logged in";
		} 
		else if (instapaper_page_html_string.search("No articles saved.") == -1 && instapaper_html.length == 0) {
			status = "no articles saved";
		} 
		else if (instapaper_page_html_string.search("No articles saved.") != -1) {
			//no articles saved *on this page* so we're done!
			status = "done";
		}
		else {
			instapaper_html.push(instapaper_page_html_string);                                    
		}
		return status;
	}
	function getDetails(instapaperPagesHTML) {
	
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
