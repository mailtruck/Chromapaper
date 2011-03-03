var folders;
var folderId = location.pathname.split('/')[2];
var folderExists = false;

/*chrome.extension.sendRequest({method: "getFolders"}, function(response) {
		folders = response.status;
		if (folders) {
			folders = folders.split(','); //basically, it's not returning a real array, just a comma-seperated string. don't ask why! no one knows
			console.log(folders);
			for (i in folders) {
				if (folders[i] == folderId) {
					folderExists = true;
					console.log("folder exists");
				}
			}
		}
		if (location.pathname.split('/')[1] == "edit_folder" && location.pathname.split('/')[2]) {
			syncFolderOption();
		}
	}
);*/



function toggleFolder() {
	if (folderExists == true) {
		//remove folder
		chrome.extension.sendRequest({method: "removeFolder", folder: folderId});
	}
	else if (folderExists == false) {
		//add folder
		chrome.extension.sendRequest({method: "addFolder", folder: folderId});
	}
}

function lol() {
	console.log("GAH");
}



function syncFolderOption() {
	
	folderId = location.pathname.split('/')[2];



	labels = document.getElementsByTagName("label");
	for (i in labels) {
		if (labels.item(i).getAttribute("for") == "folder_sync_to_iphone") {
			syncToiPhoneLabel = labels[i];
			syncToiPhoneLabel.setAttribute("style","display: block; width: 50%; margin: 0px auto 5px auto; font-size: 14px;");
		}
	}
	
	syncToChromeLabel = document.createElement("label");
	syncToChromeLabel.setAttribute("for","syncToChrome");
	syncToChromeLabel.setAttribute("style","display: block; width: 50%; margin: 0px auto 20px auto; font-size: 14px;");
	
	syncToChromeInput = document.createElement("input");
	syncToChromeInput.setAttribute("id","syncToChrome");
	syncToChromeInput.setAttribute("type","checkbox");
	if (folderExists == true) {
		syncToChromeInput.setAttribute("checked","checked");
	}
	
	syncToChromeLabel.addEventListener('mouseup', function() {
		toggleFolder();
	});
	
	insertAfter(syncToiPhoneLabel, syncToChromeLabel);
	syncToChromeLabel.appendChild(syncToChromeInput);

	syncToChromeLabel.innerHTML += "        Sync to Chromapaper";
	
	// This function inserts newNode after referenceNode
	function insertAfter( referenceNode, newNode )
	{
		referenceNode.parentNode.insertBefore( newNode, referenceNode.nextSibling );
	}
	
}