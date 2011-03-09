var database = {

	/* Global Functions */
	setup: function() {        
		database.db = openDatabase('instapaper_reader', '', 'Instapaper Articles', 1024 * 1024);
		//pages.db = database.db
		database.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
				"pages( \
				id INTEGER PRIMARY KEY ASC, \
				article_title STRING, \
				url STRING, \
				html STRING, \
				available STRING, \
				description STRING, \
				folder INTEGER)",
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
		database.db.transaction(function(tx) {
			tx.executeSql("create table if not exists " +
				"folders(id INTEGER, name STRING)",
				[],
				function() {console.log("Created/connected to DB - folders");},
				database.onError
			);
		});
		
		var dbMigrator = new Migrator(database.db);

		dbMigrator.migration(1, function(tx) {
			tx.executeSql("ALTER TABLE pages ADD COLUMN folder INTEGER",
			[],
			function () {console.log("Created folder column");},
			database.onError);
		});

		dbMigrator.execute();
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
				database.onError);
		});
		database.db.transaction(function(tx) {
			tx.executeSql('drop table images',
				[],
				null,
				database.onError);
		});
	},
	
	onError: function(tx,error) {
		console.log("Error occured: ", error.message);
	}
	
}



// created by Max Aller <nanodeath@gmail.com>
// this is an amazing piece of code from https://github.com/nanodeath/JS-Migrator - makes updating the database so much easier.
// i've embedded it here since it's easier than also having to embed migrator.js in every page
// here's a huge-ass license since I guess it's required

/* Copyright (c) 2010 Max Aller <nanodeath@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

function Migrator(db){
	// Pending migrations to run
	var migrations = [];
	// Callbacks to run when migrations done
	var whenDone = [];

	var state = 0;
	
	var MIGRATOR_TABLE = "_migrator_schema";

	// Use this method to actually add a migration.
	// You'll probably want to start with 1 for the migration number.
	this.migration = function(number, func){
		migrations[number] = func;
	};
	
	// Execute a given migration by index
	var doMigration = function(number){
		if(migrations[number]){
			db.transaction(function(t){
				t.executeSql("update " + MIGRATOR_TABLE + " set version = ?", [number], function(t){
					debug(Migrator.DEBUG_HIGH, "Beginning migration %d", [number]);
					migrations[number](t);
					debug(Migrator.DEBUG_HIGH, "Completed migration %d", [number]);
					doMigration(number+1);
				}, function(t, err){
					error("Error!: %o (while upgrading to %s from %s)", err, number);
				})
			});
		} else {
			debug(Migrator.DEBUG_HIGH, "Migrations complete, executing callbacks.");
			state = 2;
			executeWhenDoneCallbacks();
		}
	};
	
	// helper that actually calls doMigration from doIt.
	var migrateStartingWith = function(ver){
		state = 1;
		debug(Migrator.DEBUG_LOW, "Main Migrator starting.");

		try {
			doMigration(ver+1);
		} catch(e) {
			error(e);
		}
	};

	this.execute = function(){
		if(state > 0){
			throw "Migrator is only valid once -- create a new one if you want to do another migration.";
		}
		db.transaction(function(t){
			t.executeSql("select version from " + MIGRATOR_TABLE, [], function(t, res){
				var rows = res.rows;
				var version = rows.item(0).version;
				debug(Migrator.DEBUG_HIGH, "Existing database present, migrating from %d", [version]);
				migrateStartingWith(version);
			}, function(t, err){
				if(err.message.match(/no such table/i)){
					t.executeSql("create table " + MIGRATOR_TABLE + "(version integer)", [], function(){
						t.executeSql("insert into " + MIGRATOR_TABLE + " values(0)", [], function(){
							debug(Migrator.DEBUG_HIGH, "New migration database created...");
							migrateStartingWith(0);
						}, function(t, err){
							error("Unrecoverable error inserting initial version into db: %o", err);
						});
					}, function(t, err){
						error("Unrecoverable error creating version table: %o", err);
					});
				} else {
					error("Unrecoverable error resolving schema version: %o", err);
				}
			});
		});

		return this;
	};

	// Called when the migration has completed.  If the migration has already completed,
	// executes immediately.  Otherwise, waits.
	this.whenDone = function(func){
		if(typeof func !== "array"){
			func = [func];
		}
		for(var f in func){
			whenDone.push(func[f]);
		}
		if(state > 1){
			debug(Migrator.DEBUG_LOW, "Executing 'whenDone' tasks immediately as the migrations have already finished.");
			executeWhenDoneCallbacks();
		}
	};
	
	var executeWhenDoneCallbacks = function(){
		for(var f in whenDone){
			whenDone[f]();
		}
		debug(Migrator.DEBUG_LOW, "Callbacks complete.");
	}
	
	// Debugging stuff.
	var log = (window.console && console.log) ? function() { console.log.apply(console, argumentsToArray(arguments)) } : function(){};
	var error = (window.console && console.error) ? function() { console.error.apply(console, argumentsToArray(arguments)) } : function(){};
	
	var debugLevel = Migrator.DEBUG_NONE;

	var argumentsToArray = function(args) { return Array.prototype.slice.call(args); };
	this.setDebugLevel = function(level){
		debugLevel = level;
	}
	
	var debug = function(minLevel, message, args){
		if(debugLevel >= minLevel){
			var newArgs = [message];
			if(args != null) for(var i in args) newArgs.push(args[i]);
		
			log.apply(null, newArgs);
		}
	}
}

// no output, low threshold (lots of output), or high threshold (just log the weird stuff)
// these might be a little, uh, backwards
Migrator.DEBUG_NONE = 0;
Migrator.DEBUG_LOW = 1;
Migrator.DEBUG_HIGH = 2;