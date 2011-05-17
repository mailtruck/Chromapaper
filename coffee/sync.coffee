###

test if online
test if logged in
scrape folders
scrape folder x
	scrape page x
		test if has articles
			scrape each article...


this is super callback-heavy, but in mostly chronological order, so it shouldn't be too hard to follow 

###

#todo: pull out online/logged in tests to another file

# The scraper here is designed to first get the default unread page at /u, which
# should contain the list of folders in the sidebar that can be scraped to find
# the IDs of each folder.
#
# Then, it will iterate over all of the pages within /u/*, then /folder/ID/name/*

# First, let's pull the list of folders.
$.get("http://instapaper.com/u/", (html) ->
	console.log(html)
	if html.search("Log out") == -1 
		# not logged in
		popUps.notLoggedIn()
	else
		folder_links = $(html).find("#folders a")
		folder_links = folder_links[0...(folder_links.length - 2)] # removes the add folder and edit folder links

		# a link looks like /u/folder/933087/essays-short-stories
		# so that's /u/folder/<id>/<slug>
		for link in folder_links
			url = $(link).attr("href")
			id = url.split("/")[3]
			slug = url.split("/")[4]

		

)
