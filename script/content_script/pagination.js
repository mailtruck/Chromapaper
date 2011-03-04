var curPage = 1;
var scrollBy = 0;
var resized = false;
var oldSize;

var online;

//coming from online
if (location.host == "www.instapaper.com") {
	switch (location.pathname.split('/')[1]) {
		case "text":
		case "go":
			chrome.extension.sendRequest({method: "getOption", option:'paginationOnlineOn'}, function(response) {
				paginationSetting = response.status;
				isPaginateOn();
			});
			break;
	}
}

//coming from chrome extension
if (location.protocol == "chrome-extension:") {
	chrome.extension.sendRequest({method: "getOption", option: 'paginationOn'}, function(response) {
		console.log("hey trying to paginate!!!")
		paginationSetting = response.status;
		online = false;
		isPaginateOn();
	});
}

function isPaginateOn() {
	if (paginationSetting == "true") {
		paginate();
	}
}

function paginate() {

	var fileref=document.createElement("link")
	fileref.setAttribute("rel", "stylesheet")
	fileref.setAttribute("type", "text/css")
	fileref.setAttribute("href", chrome.extension.getURL("style/read.css"))
	document.getElementsByTagName("head")[0].appendChild(fileref)

	blankScreen(); //creates a blank overlay for .1 sec

	console.log("WE BE PAGINATIN'");
	storyDiv = document.getElementById("story");
	
	//so right here is where the most hacky hack sack of all time happens; and i shouldn't be surprised if support for this is removed. basically, we can run loadfont by changing the window.location to "javascript:loadFont()". Terrible.
	location.href="javascript:loadFont()"
	
	//sets up the columns
	storyDiv.setAttribute("style","-webkit-column-count:2;-webkit-column-width:50%;-webkit-column-gap:25px;text-align:justify;overflow:auto;padding:0px;height:75%;");
	
	//this looks super crazy, but all it does is make sure when the text controls are clicked that the width remains 90% and removes the width change buttons
	text_controls = document.getElementById("text_controls");
	for (i=0;i<text_controls.getElementsByTagName("a").length;i++) {
		style = text_controls.getElementsByTagName("a")[i].getAttribute("style");
		//removes the width control buttons
		if (style == "border-top: 1px solid #555; border-bottom: 1px solid #555; border-left: 6px solid #555; border-right: 6px solid #555; font-size: 8px; padding: 0 2px; vertical-align: 4px;" || style == "border-top: 1px solid #555; border-bottom: 1px solid #555; border-left: 3px solid #555; border-right: 3px solid #555; font-size: 8px; padding: 0 4px; vertical-align: 4px;") {
			style = "display:none";
			text_controls.getElementsByTagName("a")[i].setAttribute("style",style);
		}
		else {
			onClickEvent = text_controls.getElementsByTagName("a")[i].getAttribute("onClick");
			insertPos = onClickEvent.search("return false;");
			onClickEvent = onClickEvent.substr(0,insertPos) + 'document.body.setAttribute("style","width:1200px;");' + onClickEvent.substr(insertPos);
			text_controls.getElementsByTagName("a")[i].setAttribute("onClick", onClickEvent);
			text_controls.getElementsByTagName("a")[i].addEventListener("click",fontChanged,false);
		}
	}
	text_controls.getElementsByTagName("a")
	
	storyDiv.style.overflow = 'hidden';
	
	storyDiv = document.getElementById("story");

	document.onkeyup = keyboardEvent;
	
	window.onresize = scrollResize;
	
	/*window.onresize = function() {
		clearTimeout(timeOut);
		var timeOut = setTimeout(scrollResize, 1000);
	};*/
	
	if (online == true) {
		if (document.readyState != "complete") {
			console.log("using window.onload");
			window.onload = initPageCounter;
		}
		else {
			//basically this is the page has loaded but loadfont hasn't run yet... or something? anyways, loadfont should take <100 millis to run total
			console.log(document.readyState);
			setTimeout(initPageCounter,0);
		}
	}
	else {
		setTimeout(setWidth,0);
		setTimeout(initPageCounter,0);
		console.log(document.readyState);
	}
}

function scrollResize() {
	scrollDiv = document.getElementById("story");
	newSize = scrollDiv.offsetWidth;
	changeSize = newSize - oldSize;
	
	oldScroll = curPage*oldSize;
	
	if (storyDiv.clientWidth % 2 == 0) {
		//even! use 24
		scrollBy = storyDiv.clientWidth + 24
		}
	else if (storyDiv.clientWidth % 2 != 0) {
		//odd! use 25
		scrollBy = storyDiv.clientWidth + 25
	}
	
	newScroll = curPage*scrollBy - scrollBy;
	scrollDiv.scrollLeft = newScroll;
	
	scrollWidth = scrollDiv.scrollWidth;
	
	console.log(scrollWidth);
	//width reports back just fine until this is called and then it all falls the hell apart :V
	
	if (document.getElementById("blankColumn")) {
		blankColumn = document.getElementById("blankColumn");
		
		blankColumn.parentNode.removeChild(blankColumn);
		
		console.log("removed a blank column");
	}
	
	initPageCounter();
}

function fixImages() {
	storyDiv = document.getElementById("story");
	var storyImages = storyDiv.getElementsByTagName("img");
	for (counter=0; counter < storyImages.length; counter++) {
		offset = storyImages[counter].offsetTop
		divHeight = storyDiv.clientHeight;
		imgHeight = storyImages[counter].height;
		
		if (imgHeight > divHeight) {
			//the image is bigger than the columns and needs to be resized accordingly
			storyImages[counter].setAttribute("style", "display: block; border:0px; max-width: 100%; -webkit-column-break-before:always;max-height:100%;");
		}
		else if (imgHeight > divHeight - offset) {
			//the image is bigger than one column but can fit in the next
			storyImages[counter].style = "display: block; border:0px; max-width: 100%; -webkit-column-break-before:always;";
		}
	}
}

function fontChanged() {
	console.log("font changed!");
	//let's remove the current page counter
	pageCounterDiv = document.getElementById("pageCounter");
	pageCounterDiv.parentNode.removeChild(pageCounterDiv);
	
	blankColumnDiv = document.getElementById("blankColumn");
	if (blankColumnDiv) {
		blankColumnDiv.parentNode.removeChild(blankColumnDiv);
	}
	
	initPageCounter();
}

function initPageCounter() {
	setWidth();
	fixImages();
	console.log(storyDiv.scrollWidth);
	oldSize = storyDiv.clientWidth;
	if (storyDiv.clientWidth % 2 == 0) {
		//even! use 24
		scrollBy = storyDiv.clientWidth + 24
	}
	else if (storyDiv.clientWidth % 2 != 0) {
		//odd! use 25
		scrollBy = storyDiv.clientWidth + 25
	}
	initializePageCounter(storyDiv.scrollWidth,scrollBy);
}

function setWidth() {
	document.body.setAttribute("style","width:90%");
}

function keyboardEvent(event) {
	//eventually this should be wrapped in something like if pagination == 1
	if (event.keyCode == 37) {
		//scroll page left
		scrollDiv = window.document.getElementById("story");
		divWidth = scrollDiv.offsetWidth;
		scrollBefore = scrollDiv.scrollLeft;
		scrollDiv.scrollLeft = scrollDiv.scrollLeft - scrollBy;
		if (scrollBefore != scrollDiv.scrollLeft) {
			curPage--;
			updatePageCounter();
		}
	}
	if (event.keyCode == 39 || event.keyCode == 32) {
		scrollDiv = window.document.getElementById("story");
		divWidth = scrollDiv.offsetWidth;
		scrollBefore = scrollDiv.scrollLeft;
		scrollDiv.scrollLeft = scrollDiv.scrollLeft + scrollBy;
		if (scrollBefore != scrollDiv.scrollLeft) {
			curPage++;
			updatePageCounter();
		}
	}
}

function initializePageCounter(scrollWidth,divWidth) {

	if (document.getElementById("pageCounter")) {
		pageCounter = document.getElementById("pageCounter");
		
		pageCounter.parentNode.removeChild(pageCounter);
	}
	
	pageCounterDiv = document.createElement("div");
	pageCounterDiv.setAttribute("id","pageCounter");
	
	pages = (roundToHalf(scrollWidth/divWidth));
	
	//this is dumb why do i have to convert to string and look for . uuuuuuugh
	pagesStringWTF = pages.toString();
	
	if (pagesStringWTF.search("[.]") != -1 ) {
		console.log("gotta blank yall");
		newDiv = document.createElement("div");
		newDiv.setAttribute("id","blankColumn");
		newDiv.setAttribute("style","-webkit-column-break-before:always;");
		newDiv.innerHTML = "&nbsp;";
		
		storyDiv = document.getElementById("story");
		
		storyDiv.appendChild(newDiv);
	}
	console.log("Pages: " + pages);
	
	pages = Math.round(pages);
	
	if (curPage > pages) {
		curPage = pages;
	}
	pageCounterDiv.innerHTML = "Page " + curPage + " of " + pages;
	
	divs = document.getElementsByTagName("div");

	for (i=0;i < divs.length;i++) {
		if (divs[i].getAttribute("class") == "bar bottom") {
			bottomBarDiv = divs[i];
		}
	}

	document.body.insertBefore(pageCounterDiv,bottomBarDiv);
}

function updatePageCounter() {
	pageCounterDiv = document.getElementById("pageCounter");
	pageCounterDiv.innerHTML = "Page " + curPage + " of " + pages;
}

function resizePaginatedViewOverlay() { //say that five times fast
	//resized is kind of a misnomer: it's actually checking to  make sure it hasn't already been resized once, and, thus, isn't rendering more than once
	if (resized == false) {
			html = "<div id='overlayHeader'>Page resized</div><div id='overlayText'>Resizing your window in pages view messes up the page counter and scrolling. Sorry for the inconvinence, but you gotta <a onClick='window.location.reload()' href='#'>refresh</a> once you've got your window the size you want. This'll be fixed eventually.</div>";
			resized = true;
			renderOverlay(html);
	}
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

function roundToHalf(value) { 
   var converted = parseFloat(value); // Make sure we have a number 
   var decimal = (converted - parseInt(converted, 10)); 
   decimal = Math.round(decimal * 10); 
   if (decimal == 5) { return (parseInt(converted, 10)+0.5); } 
   if ( (decimal < 3) || (decimal > 7) ) { 
      return Math.round(converted); 
   } else {
      return (parseInt(converted, 10)+0.5); 
   } 
} 

function blankScreen() {
        var blankOverlay = document.createElement("blankOverlay");
        blankOverlay.setAttribute("id","blankOverlay");
        document.body.appendChild(blankOverlay);
        
        setTimeout(removeBlankScreen,100);
}

function removeBlankScreen() {
        document.body.removeChild(document.getElementById("blankOverlay"));
}

/*
 * jQuery throttle / debounce - v1.1 - 3/7/2010
 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
