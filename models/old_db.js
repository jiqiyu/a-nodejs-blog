var conf = require('../conf').db;

var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;

module.exports = new Db( conf.db,
                         new Server( conf.host,
                                     Connection.DEFAULT_PORT,
                                     {auto_reconnect : true} ),
                         {w:-1});