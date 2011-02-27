var database = {

	/* Global Functions */
	setup: function() {        
		database.db = openDatabase('instapaper_reader', '1.0', 'Instapaper Articles', 1024 * 1024);
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
			function() {console.log("Created/connected to DB - pages");}
			);
		});
		database.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
			"images(id integer, url string, src string, data blob)",
			[],
			function() {console.log("Created/connected to DB - images");}
			);
		});
	},
	
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
				pages.onError);
		});
		database.db.transaction(function(tx) {
			tx.executeSql('drop table images',
				[],
				null,
				pages.onError);
		});
	},
	

	
	onError: function(tx,error) {
		console.log("Error occured: ", error.message);
	}
	
}
