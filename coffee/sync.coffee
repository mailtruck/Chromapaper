# test if online
# test if logged in
# scrape folders
# scrape folder x
#	scrape page x
#		test if has articles
#			scrape each article...
#

# This is super callback-heavy, but in mostly chronological order, so it shouldn't be too hard to follow. Instead of just trying to do everything in one heavily-nested function, I've split out parts of the syncing process into their own functions, even if they're only used once, just to make the organization easier to follow. 

# TODO: pull out online/logged in tests to another file

# The scraper here is designed to first get the default unread page at /u, which
# should contain the list of folders in the sidebar that can be scraped to find
# the IDs of each folder.
#
# Then, it will iterate over all of the pages within /u/*, then /folder/ID/name/*

# First, let's pull the list of folders.
$.get("http://instapaper.com/u/", (html) ->
	# The easiest way to see if we're logged in is to look for the "log out" link
	if html.search("Log out") == -1 
		popUps.notLoggedIn()
		return false
	folder_links = $(html).find("#folders a")
	folder_links = folder_links[0...(folder_links.length - 2)] # removes the add folder and edit folder links

	# A link looks like /u/folder/<id>/<slug>
	# test_folder = new db.Folder({id: 1, name:"test", slug: "-test-"})
	
	folders_list = db.Folder.all().list(null, (results) -> 

		# We use this to decide if we need to do a flush... which will then also decide if we need to call the next step from the flush's callback or if we just should call it
		folder_added = false

		for link in folder_links
			# Pull out ID, Slug, and name of folder
			url = $(link).attr("href")
			id = url.split("/")[3]
			slug = url.split("/")[4]
			name = $(link).html()

			# Rolls through each result in the databse, and if it's found, doesn't write the folder in. We're finding by ID... **this won't handle folder renames.** *This is an awkward pattern... there's probably a better way.*
			exists = false 
			for i in results
				if parseInt(id) == i.instapaper_id
					exists = true

			# Write it into the database.
			if exists is false
				folder = new db.Folder({instapaper_id: id, name: name, slug: slug})
				persistence.add(folder)
				wrote_to_db = true
			
		# We need to wait until the database calls are all
		if wrote_to_db = true
			persistence.transaction( (tx) ->
				persistence.flush(tx, ->
						scrapeArticles()
					)
			)
		else
			scrapeArticles()

	)
	# Compare folders in database to folders found in list - delete ones that no longer exist - as well as articles contained within?
)

scrapeArticles = ->
	# Read folders from database
	folders_list = db.Folder.all().list(null, (results) -> 
		scrapeFolder("http://instapaper.com/u/")
		for folder in results
			console.log("for folder " + folder.name)
			instapaper_id = folder.instapaper_id
			slug = folder.slug
			url = "http://instapaper.com/u/folder/" + instapaper_id + "/" + slug + "/"
				
			scrapeFolder(url)
	)

# some recursion happenin' here
scrapeFolder = (url, i = 1) ->
	$.get(url + i, (html) ->
		# Check to see if page has articles on it
		console.log("scraping page for " + url + i)
		if (html.search("No articles in this folder.") == -1) and (html.search("No articles saved.") == -1)
			scrapeFolder(url, i + 1)
		$(html).
	)