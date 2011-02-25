//note to anyone who stumbles on this: yeah, it's pretty messy. A cleanup is on my todo list :)

var debug = true;
var online = false;

//options - rememeber, even "booleans" are just strings in localStorage!

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
		return true;
	}
	if (online == true && debug==false) {
		return false;
	}
}
online = testOnline();

if (online == true && debug==false) {
	location.replace("http://www.instapaper.com/u/");
}
else {
	location.replace("list.html");
}
