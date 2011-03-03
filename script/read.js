var curPage = 1;
var pages = 0;
var scrollBy = 0;
var id;
var resized = false;

//options - rememeber, even "booleans" are just strings in localStorage!

//true: pagination is on; false: pagination off

/*
       +--------------------+
-------|   Read Functions   |------------------------------------------------------------------------------------------
       +--------------------+
*/

//this is the base function for reading pages
function read(id) {
	database.read(id);
}

//this function renders the page, including replacing the relevant bits
function renderPage(tx,results) {
	
	document.write(results.rows.item(0).html);

	
	//Strip out the "view original" link
	barTop = getElementsByClass("bar top")[0];
	html = barTop.innerHTML;
	newHtml = html.substr(html.search("<div"));
	barTop.innerHTML = newHtml;

	//Strip out editing controls (archive/delete)
	editingControls = document.getElementById("editing_controls");
	editingControls.innerHTML = "";
	
	//Turn on text controls
	document.getElementById('text_controls_toggle').style.display = 'none'; 
	document.getElementById('text_controls').style.display = 'block'; 
	
	//Remove close button
	closeButton = getElementsByAttribute('document','div','style','float: left; margin-top: 5px;  margin-left: 10px; margin-bottom: 25px; height: 20px;')[0]
	closeButton.innerHTML = "";

	//Change link at bottom
	backLink = getElementsByAttribute('document','a','href','/u')[0];
	backLink.setAttribute("href", "list.html");
	backLink.innerHTML = "Back to Chromapaper";
	
	//Strip links
	storyDiv = document.getElementById("story");
	var storyLinks = storyDiv.getElementsByTagName("a");
	for (counter=0; counter < storyLinks.length; ) {
		removeNode(storyLinks[counter]);
	}
	
	//Replace images
	var storyImages = storyDiv.getElementsByTagName("img");
	for (i = 0; i < storyImages.length; i++) {
		database.getImage(id, storyImages[i].getAttribute("src")); //calls back replaceImage
	}
	
	//Fix encoding
	var storyDivHtml = storyDiv.innerHTML;
	newHtml = storyDivHtml.replace("’","'");
	storyDiv.innerHTML = newHtml;
	
	if (options.paginationOn.get() == "true") {
		//ghetto javascript "include"
		document.write('<script type="text/javascript" src="' + 'script/content_script/pagination.js' + '"></scr' + 'ipt>'); 
	}
	else {
		loadFont();
		saveFont();
		document.write('<script type="text/javascript" src="' + 'script/content_script/scrollTracking.js' + '"></scr' + 'ipt>');
	}
}

function replaceImage(tx,results) {
	try {
		id = results.rows.item(0).id;
		src = results.rows.item(0).src;
		imageBlob = results.rows.item(0).data;
		console.log(id);
		console.log(src);
		console.log(imageBlob);
		
		var storyImages = storyDiv.getElementsByTagName("img");
		for (i = 0; i < storyImages.length; i++) {
			if (storyImages[i].getAttribute("src") == src ) {
				storyImages[i].setAttribute("src", "data:image/jpeg;base64," + imageBlob);
			}
		}
	}
	catch(err) {
		//no image: user probably has save images turned off
		var storyImages = storyDiv.getElementsByTagName("img");
		for (i = 0; i < storyImages.length; i++) {
			storyImages[i].innerHTML = " [image] ";
			removeNode(storyImages[i]);
		}
	}
}

function removeNode(n){
    if(n.hasChildNodes())
        for(var i=0;i<n.childNodes.length;i++)
            n.parentNode.insertBefore(n.childNodes[i].cloneNode(true),n);
    n.parentNode.removeChild(n);
}


function getUrlVars() {
	var map = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		map[key] = value;
	});
	return map;
}

function getElementsByClass(searchClass,node,tag) {
	var classElements = new Array();
	if ( node == null )
		node = document;
	if ( tag == null )
		tag = '*';
	var els = node.getElementsByTagName(tag);
	var elsLen = els.length;
	var pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");
	for (i = 0, j = 0; i < elsLen; i++) {
		if ( pattern.test(els[i].className) ) {
			classElements[j] = els[i];
			j++;
		}
	}
	return classElements;
}
function getElementsByAttribute(oElm, strTagName, strAttributeName, strAttributeValue){
    var arrElements = (strTagName == "*" && document.all)? document.all : document.getElementsByTagName(strTagName);
    var arrReturnElements = new Array();
    var oAttributeValue = (typeof strAttributeValue != "undefined")? new RegExp("(^|\\s)" + strAttributeValue + "(\\s|$)") : null;
    var oCurrent;
    var oAttribute;
    for(var i=0; i<arrElements.length; i++){
        oCurrent = arrElements[i];
        oAttribute = oCurrent.getAttribute(strAttributeName);
        if(typeof oAttribute == "string" && oAttribute.length > 0){
            if(typeof strAttributeValue == "undefined" || (oAttributeValue && oAttributeValue.test(oAttribute))){
                arrReturnElements.push(oCurrent);
            }
        }
    }
    return arrReturnElements;
}

database.setup();
function pagesLoaded() {
	var h = getUrlVars();
	id = h["id"];
	read(id);
}
