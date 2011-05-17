persistence.store.websql.config(persistence, 'chromapaper', 'Chromapaper article and image storage', 25 * 1024 * 1024);

PageEntry = persistence.define("Page", [
	id: "INT"
	title: "TEXT"
	description: "TEXT"
	url: "TEXT"
	html: "TEXT"
	available: "BOOL"
])

ImageEntry = persistence.define("Image", [
	id: "INT"
	url: "TEXT"
	data: "BLOB"
])

FolderEntry = persistence.define("Folder", [
	id: "INT"
	name: "TEXT"
])

Page.hasMany('images', Image, 'page')
Folder.hasMany('pages', Page, 'folder')

persistence.schemaSync()