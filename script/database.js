var database = {

	/* Global Functions */
	setup: function() {        
		database.db = openDatabase('instapaper_reader', '1.0', 'Instapaper Articles', 1024 * 1024);
		pages.db = database.db
		database.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
				"pages( \
				id INTEGER PRIMARY KEY ASC, \
				article_title STRING, \
				url STRING, \
				html STRING, \
				available STRING, \
				description STRING, \
				images STRING)",
				[],
				pagesLoaded,
				database.onError
			);
		});
		database.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
				"images(id integer, url string, src string, data blob)",
				[],
				function() {console.log("Created/connected to DB - images");},
				database.onError
			);
		});
	},
	// WARNING: UNTESTED CODE
		// Theoretically can be used in the future to add columns without breaking everything??
		/*pages.db.transaction(function(tx) {
			tx.executeSql("if not exists (select * from information_schema.columns where table_name = 'pages' and column_name = 'images') begin alter table pages add images string end",
			[],
			function () {console.log("Created images column");}
			);
		});*/
		
	/* List Functions */
	list: function() {
		database.db.transaction(function(tx) {
			tx.executeSql(
				"select * from pages order by id desc",
				[],
				renderList,
				database.onError);
		});
	},
	
	/* Read Functions */
	read: function(id) {	
		database.db.transaction(function(tx) {
			tx.executeSql(
				"select * from pages where id=?",
				[id],
				renderPage,
				database.onError);
		});
		
	},
	getImage: function(id, src) {
		database.db.transaction(function(tx) {
			tx.executeSql(
				"select * from images where id=? AND src=?",
				[id, src],
				replaceImage,
				database.onError);
		});
	},
	
	/* Options Page Functions */
	reset: function() {
		database.db.transaction(function(tx) {
			tx.executeSql('drop table pages',
				[],
				null,
				database.onError);
		});
		database.db.transaction(function(tx) {
			tx.executeSql('drop table images',
				[],
				null,
				database.onError);
		});
	},
	
	/* Sync Functions */
	
	save: function(page) {
		database.db.transaction(function(tx) {
			tx.executeSql("insert into pages (article_title, url, html, available, description) values (?, ?, ?, 'true', ?);",
			[page.title, page.url, page.html, page.description],
			savedPage,
			database.onError
		});
	},
	
	
	onError: function(tx,error) {
		console.log("Error occured: ", error.message);
	}
	
}
