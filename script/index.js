var debug = true;
var online = false;

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
