var mongodb = require('./db');
var ObjectId = require('mongodb').ObjectID;
var ul = require('../conf').userLevel;
var limit = require('../conf').limit;
var pstate = require('../conf').postState;

function Tag(/* tag */) {/*
    
    this.name = tag.name;
    [this.postid = [];]
    [this.ppostid = [];]
    [this.description = tag.description;]
    [this.default = tag.default;] // (boolean)
    
*/};

module.exports = Tag;

Tag.all = function(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            callback(err);
        }
        db.collection('tag').find({name: {$ne: '沒有標籤'}})
            .toArray(function(err, docs) {
                db.close();
                callback(err, docs);
            });
    });

};

Tag.add = function(tag, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.createCollection('tag', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.ensureIndex(
                {name: 1},
                {unique: true},
                function(err, idx) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    collection.insert(
                        tag,
                        {safe: true},
                        function(err, doc) {
                            db.close();
                            callback(err, doc);
                        });
                });
        });
    });

};

Tag.updatePostId = function(unTagNameArr, newTagNameArr, pid, state, formerState) {

    mongodb.open(function(err, db) {
        if (err) {
            return console.log('!error! tag.js cannot open db');
        }
        switch (+state) {
        case pstate.post:
        case pstate.ontop:
            var field1 = {postid: pid};
            break;
        case pstate.ppost + pstate.ontop:
        case pstate.ppost:
            var field1 = {ppostid: pid};
            break;
        default:
            return console.log('2heeeeeeeeeeere: ' + field + pstate.post);
        }
        switch (+formerState) {
        case pstate.post:
        case pstate.ontop:
            var field2 = {postid: pid};
            break;
        case pstate.ppost + pstate.ontop:
        case pstate.ppost:
            var field2 = {ppostid: pid};
            break;
        default: 
            return console.log('22heeeeeeeeeeere: ' + field + pstate.post);
        }
        db.collection('tag').update(
            {name: {$in: unTagNameArr}},
            {$pull: field2},
            {multi: true, w: 0},
            function(err, result) {
                if (err) { console.log('!error! tag.js #101,62'); }
                db.collection('tag').update(
                    {name: {$in: newTagNameArr}},
                    {$push: field1},
                    {multi: true, w: 0},
                    function(err, result) {
                        db.close();
                        if (err) { return console.log('!error! tag.js #108,75'); }
                    });
            });
    });
    
};

Tag.delById = function(tagid, callback) {

    mongodb.open(function(err, db) {
        db.collection('tag').findOne({'_id': tagid}, function(err, doc) {
            if (err) {
                db.close();
                return callback(err);
            }
            var pid = (doc.postid && doc.postid.length) ? doc.postid : [];
            var ppid = (doc.ppostid && doc.ppostid.length) ? doc.ppostid : [];
            db.collection('tag').update(
                {'name': '沒有標籤'},
                {$addToSet: {'postid': {$each: pid},
                             'ppostid': {$each: ppid}}},
                function(err) {
                    if (err) {
                        console.log(err);
                    }
                    db.collection('tag').remove(
                        {'_id': tagid},
                        {w: 1},
                        function(err) {
                            if (err) {
                                db.close();
                                return callback(err);
                            }
                            db.collection('post').update(
                                {'_id': {$in: pid.concat(ppid)}},
                                {$pull: {'tagid': tagid}},
                                {multi: true, w: 0},
                                function(err, count) {
                                    db.close();
                                    if (err) {
                                        console.log('Error when mongodb $pull postid/ppostid');
                                    }
                                    callback(null);
                                });
                        });
                });
         });
    });
    
};

Tag.rename = function(tagid, newname, callback) {

    mongodb.open(function(err, db) {
        db.collection('tag').update(
            {'_id': tagid},
            {$set: {'name': newname}},
            function(err, count) {
                if (count !== 1) {
                    db.close();
                    console.log(err);
                    return callback('失敗');
                }
                db.close();
                callback(null);
            });
    });
    
};
