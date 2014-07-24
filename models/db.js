var MongoClient = require('mongodb').MongoClient;
var conf = require('../conf').db;

function Database (config) {
    this.uri = 'mongodb://' + config.host + ':' + config.port + '/' + config.db;
    this.options = config.options;
};

Database.prototype.times = 0;
Database.prototype.open = function(callback) {

    var obj = this;
    MongoClient.connect(obj.uri, obj.options, function(err, db) {
        if (err) {
            return callback(err);
        }
        ++Database.prototype.times;
        callback(null, db);
    });

};

Database.prototype.recount = function() {

    Database.prototype.times = 0;
    
};

module.exports = new Database(conf);