persistence.store.websql.config(persistence, 'chromapaper', 'Chromapaper article and image storage', 25 * 1024 * 1024);

# To make the models accessible in other files, we attach to window (as Coffeescript doesn't do this by default) and to a db namespace
window.db = () ->
	this.test = "hi"
window.db.Page = persistence.define("Page", {
	instapaper_id: "INT",
	title: "TEXT",
	description: "TEXT",
	url: "TEXT",
	html: "TEXT",
	available: "BOOL"
})
window.db.Image = persistence.define("Image", {
	#id: "INT"
	url: "TEXT",
	data: "TEXT" # This... this might come back to bite me. Might have to code my own BLOB type, yugh.
})
window.db.Folder = persistence.define("Folder", {
	instapaper_id: "INT",
	name: "TEXT",
	slug: "TEXT"
})

db.Page.hasMany('images', db.Image, 'page')
db.Folder.hasMany('pages', db.Page, 'folder')

persistence.schemaSync(null, (tx) ->
)