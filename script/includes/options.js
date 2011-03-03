var options = new Array();

console.log('loaded options');

var defineOptions = function () {
	options.syncButtonOn = new Option({
		name:"syncButtonOn",
		type:"checkbox",
		defaultStatus: "true",
		
		position: "first",
		header: "Enable offline sync button", 
		description: "Disable if you're not using the offline features of Chromapaper."
	});

	options.scrollTrackingOn = new Option({
		name:"scrollTrackingOn",
		type:"checkbox",
		defaultStatus:"false",
		
		position:"middle",
		header: "Save scroll position",
		description: "Saves the scroll position you leave an article at, and reloads to that position when the article is loaded."
	});

	options.saveImagesOn = new Option({
		name:"saveImagesOn",
		type:"checkbox",
		defaultStatus:"false",
		
		position:"last", 
		header: "Download Images",
		description: "Downloads article images in offline view. Only works with some images for now; the rest just show up broken."
	});

	options.paginationOnlineOn = new Option({
		name:"paginationOnlineOn",
		type:"checkbox",
		defaultStatus:"false",
		
		position:"first",
		header:"Offline two-column pagination",
		description:"Use left and right keys to navigate."
	});
	options.paginationOn = new Option({
		name:"paginationOn",
		type:"checkbox",
		defaultStatus:"false",
		
		position:"last",
		header:"Online two-column pagination",
		description:"Pagination in the online Instapaper text view."
	});
}

var Option = function (args) {
	
	this.name = args.name;
	this.type = args.type;
	this.defaultStatus = args.defaultStatus;
	
	this.header = args.header;
	this.description = args.description;
	this.position = args.position;

	/*chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
		if (request.method == "getOption" && request.option == this.name) {
			console.log('option retrieved ' + this.name)
			sendResponse({status: localStorage[this.name]});
		}
	});*/

	this.get = function() {
		if (localStorage[this.name]) {
			return localStorage[this.name];
		}
		else {
			return this.defaultStatus;
		}
	}
	this.getRequest = function() { //this is used in content scripts that can't use localStorage[]
		chrome.extension.sendRequest({method: ("getOption"), option: this.name}, function(response) {
			if (response.status) {
				return response.status;
			}
			else {
				return this.defaultStatus;
			}
		});
	}
	this.set = function(newStatus) {
		localStorage[this.name] = newStatus;
	}
}

defineOptions();