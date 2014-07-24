var mongodb = require('./db');
var ul = require('../conf').userLevel;

function User(/* user */) {/*
                             
    this.name = user.name; // unique
    this.password = user.password;
    this.level = user.level;
    [this.postid = [];]
    [this.ppostid = [];]
    [this.draftid = [];]
    [this.commentid = [];]
    // [this.screenname = user.screenname;]
    [this.email = user.email;] // unique
    [this.intro = user.intro;]
    
*/};

module.exports = User;

User.count = function(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.createCollection('user', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.count({level: ul.su}, function(err, nSu) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                if (nSu === 0) {
                    db.close();
                    return callback('no user');
                }
                collection.count({level: ul.editor}, function(err, nEd) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    collection.count({level: ul.author}, function(err, nAu) {
                        if (err) {
                            db.close();
                            return callback(err);
                        }
                        collection.count({level: ul.reg}, function(err, nReg) {
                            db.close();
                            if (err) {
                                return callback(err);
                            }
                            callback(err, nSu, nEd, nAu, nReg);
                        });
                    });
                });
            });
        });
    });
    
};

User.add = function(user, callback) {
    
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        if (user.level >= ul.author) {
            user.postid = [];
            user.ppostid = [];
            user.draftid = [];
        }
        user.commentid = [];
        db.createCollection('user', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.ensureIndex(
                {'name': 1},
                {unique: true},
                function(err) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    collection.insert(user, {safe: true}, function(err, doc) {
                        db.close();
                        callback(err, doc);
                    });
                });
        });
    });
    
};

User.all = function(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('user').find().toArray(function(err, arr) {
            db.close();
            callback(err, arr);
        });
    });
    
};

User.get = function(username, callback) {
    
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('user', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.findOne({name: username}, function(err, item) {
                db.close();
                if (item) {
                    callback(err, item);
                } else {
                    callback(err, null);
                }
            }); 
        });
    });
    
};

User.switchAuthor = function(unamePush, unamePull, pid, state, formerState) {

    mongodb.open(function(err, db) {
        if (err) {
            return console.log('!error! user.js cannot open db');
        }
        switch (+state) {
        case pstate.post:
        case pstate.ontop:
            var field = {postid: pid};
            break;
        case pstate.ppost + pstate.ontop:
        case pstate.ppost:
            var field = {ppostid: pid};
            break;
        default:
            return console.log('heeeeeeeeeeere: ' + field + pstate.post);
        }
        db.collection('user').update(
            {name: unamePush},
            {$push: field},
            {multi: true, w: 0},
            function(err, result) {
                if (err) { console.log('!error! user.js line #93'); }
                switch (+formerState) {
                case pstate.draft:
                    field = {draftid: pid};
                    break;
                case pstate.post:
                case pstate.ontop:
                    field = {postid: pid};
                    break;
                case pstate.ppost + pstate.ontop:
                case pstate.ppost:
                    field = {ppostid: pid};
                    break;
                default:
                    return console.log('heeeeeeeeeeere: ' + field + pstate.post);
                }
                db.collection('user').update(
                    {name: unamePull},
                    {$pull: field},
                    {multi: true, w: 0},
                    function(err, result) {
                        db.close();
                        if (err) { return console.log('!error! user.js line #115'); }
                    });
            });
    });
    
};

User.delPid = function(objArr, callback) {

    var count = 0, len = objArr.length;
    if (len) {
        mongodb.open(function(err, db) {
            if (err) {
                return callback(err);
            }
            objArr.forEach(function(el) {
                if (el.pid !== '') {
                    db.collection('user').update(
                        {_id: el.id},
                        {$pull: {postid: el.pid}},
                        {w: 0, multi: true}
                    );
                }
                if (el.ppid !== '') {
                    db.collection('user').update(
                        {_id: el.id},
                        {$pull: {ppostid: el.ppid}},
                        {w: 0, multi: true}
                    );
                }
                if (el.draftid !== '') {
                    db.collection('user').update(
                        {_id: el.id},
                        {$pull: {draftid: el.draftid}},
                        {w: 0, multi: true}
                    );
                }
                if (++count === len) {
                    db.close();
                    callback(null);
                }
            });
        });
    }
    
};

User.del = function(userid, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post').update(
            {'authorid': userid},
            {$set: {'authorid': 0}},
            {multi: true, w: 0},
            function(err) {
                if (err) {
                    db.close();
                    callback(err);
                }
                db.collection('comment').update(
                    {'authorid': userid},
                    {$set: {'authorid': 0}},
                    {multi: true, w: 0},
                    function(err) {
                        db.collection('user').remove(
                            {'_id': userid},
                            function(err) {
                                db.close();
                                callback(err);
                            });
                    });
            });
    });
    
};

User.edit = function(username, updateItemObj, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('user').update(
            {'name': username},
            {$set: updateItemObj},
            {upsert: true},
            function(err) {
                db.close();
                callback(err);
            });
    });
    
};