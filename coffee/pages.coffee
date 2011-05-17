# the goal here is to define the pages object and the page object within it
# assume there's already a database object with low-level functions in it

class Page
	constructor: (page_model) ->
	scrape: ->
		$.get(fields.url, (data) ->
			console.log(data)
			page_model.html = data
		)
	scrapeImages: () ->
		