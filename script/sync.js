
/*

Okay, this is a really bad file.

I'm going to do a true rewrite of it at some point soon, but honestly I'm more worried about adding more features than fixing things that (somehow) work. This code is a network of awkward callbacks and unstructured bits because I'd never really done development with anything asynchronous before. What you're seeing here is me attempting to handle a bunch of asynchronous WebSQL, and doing pretty badly at it. Oh, and there's various globals, including /loop counters/. 

What we're getting at here is that I am not a good coder. But hey, I'm trying to learn! :)

-- Thomas

*/

var syncFailed = false;
var isPageSaved;
var scrapedURLs;
var scrapedDetails;
var archivedIds = new Array();
var gloop_counter = 0;
var archivedNum = 0;
var error400 = false;

var downloadedPages = 0;
var savedPages = 0;
var archiveDone = false;
var saveDone = false;
var syncing = false;

var saveImagesOption = localStorage['saveImagesOn']
if (!saveImagesOption) {
	saveImagesOption = "false";
}

var foldersToSync = localStorage['folders'];
if (foldersToSync) {
	foldersToSync = foldersToSync.split(','); //gahhhhh
}


var pages = {

	setup: function() {        
		pages.db = openDatabase('instapaper_reader', '1.0', 'Instapaper Articles', 1024 * 1024);
		pages.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
			"pages(id integer primary key asc, article_title string, url string, html string, available string, description string, images string)",
			[],
			function() {console.log("Created/connected to DB - pages");}
			);
		});
		
		// WARNING: UNTESTED CODE
		// Theoretically can be used in the future to add columns without breaking everything??
		/*pages.db.transaction(function(tx) {
			tx.executeSql("if not exists (select * from information_schema.columns where table_name = 'pages' and column_name = 'images') begin alter table pages add images string end",
			[],
			function () {console.log("Created images column");}
			);
		});*/
		
		pages.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
			"images(id integer, url string, src string, data blob)",
			[],
			function() {console.log("Created/connected to DB - images");sync();}
			);
		});
	},
	reset: function() {
			pages.db.transaction(function(tx) {
				tx.executeSql('drop table pages',
				[],
				null,
				pages.onError);
			});
		},
	save: function(page) {
		pages.db.transaction(function(tx) {
			tx.executeSql("insert into pages (article_title, url, html, available, description) values (?, ?, ?, 'true', ?);",
			[page.title, page.url, page.html, page.description],
			function (tx,results) {
				console.log("page saved");
				
				titleForDisplay = page.title.substr(0,40);
				html = 'Saved "' + titleForDisplay;
				if (titleForDisplay != page.title) {
					html = html + '...';
				}
				html = html + '"';
				document.getElementById("overlayText").innerHTML =  html
				
				savedPages++;
				if (downloadedPages == savedPages) {
					console.log("all pages downloaded??");
					saveDone = true;
					if (syncFailed == false) {
						if (archiveDone == true && saveDone == true) {
							syncSuccessOverlay();
						}
					}
					else {
						syncSuccessOverlay();
					}
				}
			},
			pages.onError);
		});
	},
	checkPage: function(url,loop_counter) {
		pages.db.transaction(function(tx) {
			tx.executeSql("select * from pages where url=?",
			[url],
			function (tx, results) {
				if (results.rows.length == 0) {
					syncing = true;
					savePage(loop_counter);
				}
			},
			pages.onError);
		});
	},
	archive: function() {
		pages.db.transaction(function(tx) {
			tx.executeSql(
			"select * from pages",
			[],
			function (tx, results) {
				if (syncFailed == false) {
					if (syncing == false) {
						saveDone = true;
					}
					savedPageCount = results.rows.length;
					if (savedPageCount > 0) {
						for (i = 0; i <= (savedPageCount-1); i++) {
							var archived = true;
							url = results.rows.item(i).url;
							for (i2 in scrapedURLs) {
								if (url == scrapedURLs[i2]) {
									archived = false;
								}
							}
							if (archived == true) {
								archivedIds[archivedNum] = results.rows.item(i).id;
								archivedNum++;
								
								titleForDisplay = results.rows.item(i).article_title.substr(0,40);
								html = 'Archived "' + titleForDisplay;
								if (titleForDisplay != results.rows.item(i).article_title) {
									html = html + '...';
								}
								html = html + '"';
								document.getElementById("overlayText").innerHTML =  html
							}
						}
						if (archivedNum != 0) {
							for (i = 0; i < archivedNum; i++) {
								console.log("removed article");
								pages.remove(archivedIds[i]);
							}
						}
						else {
							console.log("no pages to archive");
							archiveDone = true;
							console.log("archiveDone is " + archiveDone);
							console.log("saveDone is " + saveDone);
							if (archiveDone == true && saveDone == true) {
								console.log('calling sync success overlay');
								syncSuccessOverlay();
							}
						}
					}
					else {
						console.log("no pages");
						archiveDone = true;
						if (archiveDone == true && saveDone == true) {
							console.log('calling sync success overlay');
							syncSuccessOverlay();
						}
					}
				}
			},
			pages.onError);
		});
	},
	saveImage: function(id, url, src, imageBlob) {
		pages.db.transaction(function(tx) {
			tx.executeSql(
				"INSERT INTO images (id, url, src, data) values (?, ?, ?, ?)",
				[id, url, src, imageBlob],
				function (tx,results) {
					console.log("saved image " + src);
				},
				pages.onError);
		});
	},
			
	remove: function(id) {
		pages.db.transaction(function(tx) {
			tx.executeSql(
				"DELETE from pages where id=?",
				[id],
				function (tx, results) {
					gloop_counter++;
					if (gloop_counter == archivedNum) {
						archiveDone = true;
						if (archiveDone == true && saveDone == true) {
							syncSuccessOverlay();
						}
					}
				},
				pages.onError);
		});
	},
		
	onError: function(tx,error) {
			console.log("Error occured: ", error.message);
		}
};


//this is the big function pressing the sync button calls!!!!!
function sync() {

	syncOverlay();
	
	var instapaperHTMLPages = new Array(); //instapaperHTMLPages is where the HTML of the Instapaper lists go
	instapaperHTMLPages = getInstapaperHTML();
	
	//if the first page has no articles, there ain't no articles.
	if (instapaperHTMLPages[0] == "no articles") {
		removeOverlay();
		noArticlesOverlay();
		return;
	}
	
	scrapedURLs = scrapeURLs(instapaperHTMLPages); //scrape URLs from each downloaded page
	console.log(scrapedURLs.length + "URLs scraped");
	scrapedDetails = scrapeDetails(instapaperHTMLPages);
	var pageExists;
	var loop_counter = 0;
	
	updateDB();

}

function updateDB() {
	for (loop_counter in scrapedURLs) {
		if (syncFailed == false) {
			pages.checkPage(scrapedURLs[loop_counter],loop_counter); //calls back savePage()
		}
	}
	console.log("about to archive");
	pages.archive();
}

function savePage(loop_counter) {
	
	//first, let's write the page to the object
	page = new Object();
	page.url = scrapedURLs[loop_counter];

	if (syncFailed == false) {
		page.html = scrapePage(loop_counter,page.url); //this is tucked away, but this is where the page is actually scraped! 
		if (page.html == "400") {
			console.log("ERROR 400!!!");
			syncFailed = true;
			error400 = true;
			syncError400Overlay();
			return;
		}
		
		page.title = scrapedDetails[loop_counter].title;
		page.description = scrapedDetails[loop_counter].description;
		console.log(loop_counter + " | " + page.title + " | " + page.description);
		//page.available = scrapedDetails[loop_counter].available; //someday this will actually be a thing
		
		//update the overlay
		titleForDisplay = page.title.substr(0,40);
		html = 'Downloaded "' + titleForDisplay;
		if (titleForDisplay != page.title) {
			html = html + '...';
		}
		html = html + '"';
		document.getElementById("overlayText").innerHTML =  html;
		
		downloadedPages++;
		pages.save(page);
	}
}

//this function downloads the html for each instapaper unread page
function getInstapaperHTML() {
	var instapaperHTML = new Array();
	var loop_counter = 1;
	var stop = 0;
	var notloggedin = false;
	var noarticles = false;
	
	//loop this for each page
	while (stop != 1) {
		var instapaperPage = new XMLHttpRequest();
		try {
			instapaperPage.open("GET", "http://www.instapaper.com/u/" + loop_counter, false);
			instapaperPage.send();
		}
		catch(err) {
			console.log("Error description: " + err.description);
		}
		
		var instapaperPageHTMLString = new String();
		var instapaperPageHTMLString = instapaperPage.responseText;
		
		//First, check to make sure there's items on the page. If not, stop.

		if (instapaperPageHTMLString.search("Log out") == -1) {
			//not logged in
			notloggedin = true;
			stop = 1;
			return ["not logged in"];
		} 
		if (instapaperPageHTMLString.search("No articles saved.") != -1) {
			//no articles saved *on this page*
			if (loop_counter == 1) {
				noarticles = true;
			}
			stop = 1
		}
		if (stop == 1) {
			//do nothing
		}
		else {
			instapaperHTML[loop_counter] = instapaperPageHTMLString;                                    
		}
		loop_counter++;
	}
	
	if (notloggedin == true) {
		return ["not logged in"];
	}
	if (noarticles == true) {
		return ["no articles"];
	}
	
	if (foldersToSync) {
		console.log("well, folderstosync exists... that's a start");
		for (i in foldersToSync) {
			console.log("loopin for each folder");
			folderNum = foldersToSync[i];
			console.log("folder: " + folderNum);
			loop_counter = 1;
			
			stop = false;
			
			while (stop != true) {
				var instapaperPage = new XMLHttpRequest();
				try {
					instapaperPage.open("GET", "http://www.instapaper.com/u/folder/" + folderNum + "/lol/" + loop_counter, false);
					instapaperPage.send();
				}
				catch(err) {
					console.log("Error description: " + err.description);
				}
				
				var instapaperPageHTMLString = new String();
				var instapaperPageHTMLString = instapaperPage.responseText;
				
				//First, check to make sure there's items on the page. If not, stop.

				if (instapaperPageHTMLString.search("No articles in this folder.") != -1) {
					//no articles saved *on this page*
					stop = true
				}
				if (stop != true) {
					instapaperHTML[instapaperHTML.length + 1] = instapaperPageHTMLString;                  
				}
				loop_counter++;
			}
		}
	}
	
	return instapaperHTML;
}
//this function scrapes and returns the urls on each page downloaded
function scrapeURLs(instapaperPagesHTML) {
	var instapaperURLs = new Array();

	var loop_counter = 1;
	var num_urls = 0;
	
	for (loop_counter in instapaperPagesHTML) {
		var instapaperPageStringUnescaped = instapaperPagesHTML[loop_counter];
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
function scrapeDetails(instapaperPagesHTML) {
	
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
//this function scrapes for html of a url
function scrapePage(id,url) {
	var scraper = new XMLHttpRequest();
	try {
		scraper.open("GET", "http://www.instapaper.com" + url, false);
		scraper.send();
	}
	catch(err) {
		console.log("Error description: " + err.description);
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
	
	if (saveImagesOption == "true") {
		scrapeImages(id,url,scraperParser);
	}
	
	return html;
}

function scrapeImages(oid,url,html) {
	id = parseInt(oid) + 1
	console.log(html);
	var images = html.getElementsByTagName("img");
	console.log(images.length);
	console.log(images);
	for (curImage = 0;curImage < images.length;curImage++) {
		console.log(curImage);
		imgSrc = images[curImage].getAttribute("src");
		
		var image = new XMLHttpRequest();
		image.open("GET",imgSrc,false);
		image.overrideMimeType('text/plain; charset=x-user-defined');
		image.send();
		
		blobEncoded = Base64.encodeBinary(image.responseText); 
		
		pages.saveImage(id, url, imgSrc, blobEncoded);
	}
}

function syncOverlay() {
	html = "<div id='overlayHeader'>Syncing...</div><div id='overlayText'>Loading pages...</div>"
	renderOverlay(html);
}

function syncError400Overlay() {
	removeOverlay();
	html = "<div id='overlayHeader'>Syncing error 400</div><div id='overlayText'>Not all articles synced. Please wait a few minutes and refresh to finish syncing. <a href='error400.html'>Why does this happen?</a></div>"
	renderOverlay(html);
}

function syncSuccessOverlay() {
	if (syncFailed == false) {
		removeOverlay();
		html = "<div id='overlayHeader'>Sync finished.</div><div id='overlayText'>Redirecting...</div>";
		renderOverlay(html);
		console.log("REDIRECT TRIGGERED");
		setTimeout('redirectHome()',2000);
	}
	else {
		syncError400Overlay();
	}
}

function redirectHome() {
	window.location = "http://www.instapaper.com";
}

function noArticlesOverlay() {
	html = "<div id='overlayHeader'>No pages!</div><div id='overlayText'>You have no pages in your Instapaper list. Go to <a class='overlayLink' href='http://instapaper.com/'>instapaper.com</a> to add some.</div>"
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







//this space intentionally left blank. here's what actually first

pages.setup();

//window.onload = sync;



String.prototype.startsWith = function(str){
	return (this.indexOf(str) === 0);
}







Base64 = {
 
 // private property
 _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

 encodeBinary : function(input){
  var output = "";
  var bytebuffer;
  var encodedCharIndexes = new Array(4);
  var inx = 0;
  var paddingBytes = 0;
   
  while(inx < input.length){
   // Fill byte buffer array
   bytebuffer = new Array(3);
   for(jnx = 0; jnx < bytebuffer.length; jnx++)
    if(inx < input.length)
     bytebuffer[jnx] = input.charCodeAt(inx++) & 0xff; // throw away high-order byte, as documented at: https://developer.mozilla.org/En/Using_XMLHttpRequest#Handling_binary_data
    else
     bytebuffer[jnx] = 0;
   
   // Get each encoded character, 6 bits at a time
   // index 1: first 6 bits
   encodedCharIndexes[0] = bytebuffer[0] >> 2;  
   // index 2: second 6 bits (2 least significant bits from input byte 1 + 4 most significant bits from byte 2)
   encodedCharIndexes[1] = ((bytebuffer[0] & 0x3) << 4) | (bytebuffer[1] >> 4);  
   // index 3: third 6 bits (4 least significant bits from input byte 2 + 2 most significant bits from byte 3)
   encodedCharIndexes[2] = ((bytebuffer[1] & 0x0f) << 2) | (bytebuffer[2] >> 6);  
   // index 3: forth 6 bits (6 least significant bits from input byte 3)
   encodedCharIndexes[3] = bytebuffer[2] & 0x3f;  
   
   // Determine whether padding happened, and adjust accordingly
   paddingBytes = inx - (input.length - 1);
   switch(paddingBytes){
    case 2:
     // Set last 2 characters to padding char
     encodedCharIndexes[3] = 64; 
     encodedCharIndexes[2] = 64; 
     break;
    case 1:
     // Set last character to padding char
     encodedCharIndexes[3] = 64; 
     break;
    default:
     break; // No padding - proceed
   }
   // Now we will grab each appropriate character out of our keystring
   // based on our index array and append it to the output string
   for(jnx = 0; jnx < encodedCharIndexes.length; jnx++)
    output += this._keyStr.charAt(encodedCharIndexes[jnx]);
  }
  return output;
 }
}