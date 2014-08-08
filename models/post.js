var mongodb = require('./db');
var ObjectId = require('mongodb').ObjectID;
var ul = require('../conf').userLevel;
var limit = require('../conf').limit;
var pstate = require('../conf').postState;

function Post(/* post */) {/*
                             
    this.title = post.title;
    this.original = post.original;
    this.content = post.content;
    this.authorid = post.authorid;
    this.catid = post.catid;
    this.tagid = post.tagid;
    this.state = post.state;
    this.year = post.year;
    this.month = post.month;
    [this.commentoff = post.commentoff] // (boolean)
    [this.appointed_time = post.appointed_time;]
    [this.level = post.level;] // (number) equals to author's level
    [this.isprivate = post.isprivate;] // (boolean) when this.state = pstate.draft
    [this.ontop = post.ontop;] // (boolean) when this.state = pstate.draft
    [this.more = post.more;] // (undefined/false or number) [[!more]]

*/};

module.exports = Post;

// ---------- home page functions ------------
Post.checkAppointment = function(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }

            var formerIdsArr = [];
            var postsArr = [];
            var now = Date.now();

            collection.find(
                {$and: [{appointed_time: {$exists: true}},
                        {state: pstate.draft}
                       ]}
            ).each(function(err, item) {
                if (err) {
                    db.close();
                    callback(err);
                }
                if (item === null) {
                    db.close();
                    callback(null, formerIdsArr, postsArr);
                } else if (item.appointed_time <= now ) {
                    var timestamp = Math.floor(item.appointed_time/1000);
                    formerIdsArr.push(item._id);
                    item._id = ObjectId(timestamp);
                    if (item.isprivate && item.ontop) {
                        item.state = pstate.ppost + pstate.ontop;
                    } else if (item.isprivate) {
                        item.state = pstate.ppost;
                    } else if (item.ontop) {
                        item.state = pstate.ontop;
                    } else {
                        item.state = pstate.post;
                    }
                    postsArr.push(item);
                }
            });
        });
    });

};

Post.getOnTop = function(callback) {
    
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var search = collection.find({
                state: {$in: [pstate.ontop,
                              pstate.ontop + pstate.ppost]}
            });
            search.sort({_id:-1}).toArray(function(err, docs) {
                db.close();
                callback(err, docs);
            });
        });
    });

};

Post.getPosts = function(startId, count, page,
                         currPage, maxPage, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }

            var skip = 0;

            if (startId) {
                if (currPage && (page > currPage)) {
                    if (maxPage && page > maxPage) {
                        page = maxPage;
                    }
                    skip = (page - currPage - 1) * count;
                    var search = collection.find(
                        {$and: [{_id: {$lt: startId}},
                                {state: {$in: [pstate.post,
                                               pstate.ppost]}}
                               ]}
                    );
                }
                if (currPage && (page < currPage)) {
                    if ((currPage - page) < page) {
                        skip = (currPage - page) * count;
                        var search = collection.find(
                            {$and: [{_id: {$gt: startId}},
                                    {state: {$in: [pstate.post,
                                                   pstate.ppost]}}
                                   ]}
                        );
                    } else {
                        skip = (page - 1) * count;
                        var search = collection.find(
                            {state: {$in: [pstate.post,
                                           pstate.ppost]}}
                        );
                    }
                }
                if (currPage && (page = currPage)) {
                }
                if (!currPage) {}
            } else {
                skip = (page - 1) * count;
                var search = collection.find(
                    {state: {$in: [pstate.post, pstate.ppost]}}
                );
            }
            if (skip) {
                search.sort({_id: -1}).skip(skip).limit(count).toArray(
                    function(err, docs) {
                        db.close();
                        callback(err, docs);
                    }
                );
            } else {
                search.sort({_id: -1}).limit(count).toArray(
                    function(err, docs) {
                        db.close();
                        callback(err, docs);
                    }
                );
            }
        });
    });

};

Post.maxPage = function(currUid, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        if (currUid) {
            db.collection('user', function(err, collection) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                collection.findOne({_id: currUid}, function(err, user) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    if (user && user.ppostid && user.ppostid.length) {
                        var ppostCount = user.ppostid.length;
                    } else {
                        var ppostCount = 0;
                    }
                    db.collection('post', function(err, coll) {
                        if (err) {
                            db.close();
                            return callback(err);
                        }
                        coll.findOne(
                            {property: {$exists: true}},
                            function(err, doc) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                
                                if (doc && doc.property.postCounter) {
                                    var total = doc.property.postCounter;
                                } else {
                                    var total = 0;
                                }
                                if (total) {
                                    total = total + ppostCount;
                                } else {
                                    total = ppostCount;
                                }

                                if (total) {
                                    var n = total / limit.postsPerPage;
                                    var maxPage =
                                        (parseInt(n) === n) ? n : parseInt(n)+1;
                                } else {
                                    var maxPage = 1;
                                }

                                db.close();
                                callback(err, maxPage);
                            });
                    });
                });
            });
        } else {
            db.collection('post', function(err, coll) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                coll.findOne(
                    {property: {$exists: true}},
                    function(err, doc) {
                        if (err) {
                            db.close();
                            return callback(err);
                        }

                        if (doc && doc.property.postCounter) {
                            var total = doc.property.postCounter;
                            var n = total / limit.postsPerPage;
                            var maxPage =
                                (parseInt(n) === n) ? n : parseInt(n)+1;
                        } else {
                            var maxPage = 1;
                        }

                        db.close();
                        callback(err, maxPage);
                    });
            });
        }
    });
    
};

Post.getNameById = function(postsArr, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        
        var count = 0, len = postsArr.length;
        
        postsArr.forEach(function(el) {
            db.collection('user', function(err, collect) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                collect.findOne(
                    {_id: el.authorid},
                    {name: 1},
                    function(err, author) {
                        if (err) {
                            db.close();
                            return callback(err);
                        }
                        el.author = author ? author.name : '[已註銷]';
                        db.collection('category', function(err, coll) {
                            if (err) {
                                db.close();
                                return callback(err);
                            }
                            coll.find(
                                {_id: {$in: el.catid}},
                                {name: 1}
                            ).toArray(function(err, cat) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                el.catName = [];
                                var m, clen = cat.length;
                                for (m=0; m<clen; m++) {
                                    el.catName.push(cat[m].name);
                                }
                                
                                db.collection('tag', function(err, cl) {
                                    if (err) {
                                        db.close();
                                        return callback(err);
                                    }
                                    cl.find(
                                        {_id: {$in: el.tagid}},
                                        {name: 1}
                                    ).toArray(function(err, tag) {
                                        if (err) {
                                            db.close();
                                            return callback(err);
                                        }
                                        el.tagName = [];
                                        var n, tlen = tag.length;
                                        for (n=0; n<tlen; n++) {
                                            el.tagName.push(tag[n].name);
                                        }
                                        
                                        if (++count === len) {
                                            db.close();
                                            callback(err, postsArr);
                                        }
                                    });
                                });
                            });
                        });
                    });
            });
        });
    });

};

Post.getPostById = function(pid, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post').findOne({_id: pid}, function(err, doc) {
            db.close();
            callback(err, doc);
        });
    });
    
};


// -------- control panel functions -----------
Post.cpMaxPage = function(userObj, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post').findOne(
            {property: {$exists: true}},
            function(err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                var count = 0;
                var maxPage = 0;
                if (doc) {
                    if (doc.property['topCounter']) {
                        count += doc.property['topCounter'];
                    }
                    if (doc.property['postCounter']) {
                        count += doc.property['postCounter'];
                    }
                    if (doc.property['ppostCounter']) {
                        count += doc.property['ppostCounter'];
                    }
                    if (doc.property['draftCounter']) {
                        count += doc.property['draftCounter'];
                    }
                    if (userObj.level === ul.su) {
                        db.close();
                        var n = count / limit.cpPostsPerPage;
                        maxPage = (parseInt(n) === n) ? n :
                            parseInt(n) + 1;
                        callback(err, maxPage);
                    } else if (userObj.level > ul.author) {
                        var cursor =
                            db.collection('user').find(
                                {$and: [
                                    {level: {$ge: ul.editor}},
                                    {_id: {$ne: userObj._id}}
                                ]}
                            );
                        var sub = 0;
                        cursor.each(function(err, item) {
                            if (item && item.postid &&
                                item.postid.length) {
                                sub += item.postid.length;
                            }
                            if (item && item.ppostid &&
                                item.ppostid.length) {
                                sub += item.ppostid.length;
                            }
                            if (item && item.draftid &&
                                item.draftid.length) {
                                sub += item.draftid.length;
                            }
                            if (item === null) {
                                db.close();
                                var n =
                                    (count - sub) / limit.cpPostsPerPage;
                                maxPage = (parseInt(n) === n) ? n :
                                    parseInt(n) + 1;
                                callback(err, maxPage);
                            }
                        });
                    } else {
                        db.collection('user').findOne(
                            {_id: userObj._id},
                            function(err, u) {
                                db.close();
                                var n = 0;
                                if (u) {
                                    if (u.postid) {
                                        n += u.postid.length;
                                    }
                                    if (u.ppostid) {
                                        n += u.ppostid.length;
                                    }
                                    if (u.draftid) {
                                        n += u.draftid.length;
                                    }
                                    n = n / limit.cpPostsPerPage;
                                    maxPage =
                                        (parseInt(n) === n) ? n :
                                        parseInt(n) + 1;
                                    callback(err, maxPage);
                                } else {
                                    return callback('error: user does not exists');
                                }
                            });
                    }
                } else {
                    db.close();
                    return callback(err, maxPage);
                }
            });
    });
    
};

Post.cpGetPosts = function(userObj, startId, count, page,
                           currPage, maxPage, callback) {
    
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        var skip = 0;
        var search;
        if (startId) {
            if (currPage && (page > currPage)) {
                if (maxPage && (page > maxPage)) {
                    page = maxPage;
                }
                skip = (page - currPage - 1) * count;
                search = db.collection('post').find(
                    {$and: [
                        {_id: {$lt: startId}},
                        {$or: [
                            {authorid: userObj._id},
                            {level: {$lt: userObj.level}}
                              ]}
                           ]},
                    {content: 0}
                );
            }
            if (currPage && (page < currPage)) {
                if ((currPage - page) < page) {
                    skip = (currPage - page) * count;
                    search = db.collection('post').find(
                        {$and: [
                            {_id: {$gt: startId}},
                            {$or: [
                                {authorid: userObj._id},
                                {level: {$lt: userObj.level}}
                            ]}
                        ]},
                        {content: 0}
                    );
                }
            } else {
                skip = (page - 1) * count;
                search = db.collection('post').find(
                    {$or: [{authorid: userObj._id},
                           {level: {$lt: userObj.level}}
                          ]},
                    {content: 0}
                );
            }
            if (currPage && (page = currPage)) {}
            if (!currPage) {}
        } else {
            skip = (page - 1) * count;
            search = db.collection('post').find(
                {$or: [{authorid: userObj._id},
                       {level: {$lt: userObj.level}}
                      ]},
                {content: 0}
            );
        }
        if (skip) {
            search.sort({_id: -1}).skip(skip).limit(count).toArray(
                function(err, docs) {
                    db.close();
                    callback(err, docs);
                }
            );
        } else {
            search.sort({_id: -1}).limit(count).toArray(
                function(err, docs) {
                    db.close();
                    callback(err, docs);
                });
        }
    });

};

Post.getAuthorList = function(level, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('user', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.find(
                { $and: [ {level: {$gt: ul.reg} },
                          {level: {$lt: level}} ] },
                {name:1, level: 1}
            ).toArray(function(err, author) {
                db.close();
                callback(err, author);
            });
        });
    });

};

Post.getTagId = function(tagArr, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('tag', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.find(
                {name: {$in: tagArr}},
                {name: 1}
            ).toArray(function(err, doc) {
                if (err) {
                    db.close();
                    callback(err);
                }
                if (doc.length) {
                    db.close();
                    callback(err, doc);
                } else {
                    db.close();
                    callback(err, null);
                }
            });
        });
    });
    
};

Post.getTaggedPosts = function(tagName, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('tag', function(err, coll) {
            if (err) {
                db.close();
                return callback(err);
            }
            coll.findOne({name: tagName}, function(err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                if (!doc) {
                    db.close();
                    return callback('沒這個標籤', null);
                }
                
                var len1 = doc.postid ? doc.postid.length : 0;
                var len2 = doc.ppostid ? doc.ppostid.length : 0;
                if (!len1 && !len2) {
                    db.close();
                    return callback(err, null);
                }
                var tids = [];
                if (len1) {
                    tids = tids.concat(doc.postid);
                }
                if (len2) {
                    tids = tids.concat(doc.ppostid);
                }
                
                db.collection('post', function(err, coll) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    coll.find(
                        {_id: {$in: tids}},
                        {content: 0}
                    ).toArray(function(err, docs) {
                        db.close();
                        callback(err, docs);
                    });
                });
            });
        });
    });

};

// upsert post's property
Post.upsProperty = function(postPropObj, callback) {
    
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.createCollection('post', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.findOne(
                {property: {$exists: true}}, function(err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                if (doc) {
                    if (doc.property['postCounter']) {
                        collection.update(
                            {_id: doc._id},
                            {$inc: {'property.postCounter':
                                    postPropObj.postCounter}},
                            {w: 0}
                        );
                    } else if (postPropObj.postCounter >= 0) {
                        collection.update(
                            {_id: doc._id},
                            {$set: {'property.postCounter':
                                    postPropObj.postCounter}},
                            {w: 0}
                        );
                    }
                    if (doc.property['ppostCounter']) {
                        collection.update(
                            {_id: doc._id},
                            {$inc: {'property.ppostCounter':
                                    postPropObj.ppostCounter}},
                            {w: 0}
                        );
                    } else if (postPropObj.ppostCounter >= 0) {
                        collection.update(
                            {_id: doc._id},
                            {$set: {'property.ppostCounter':
                                    postPropObj.ppostCounter}},
                            {w: 0}
                        );
                    }
                    if (doc.property['topCounter']) {
                        if (limit.ontop &&
                            doc.property[topCounter] >= limit.ontop) {
                            return callback('ontop error');
                        }
                        collection.update(
                            {_id: doc._id},
                            {$inc: {'property.topCounter':
                                    postPropObj.topCounter}},
                            {w: 0}
                        );
                    } else if (postPropObj.topCounter >= 0) {
                        collection.update(
                            {_id: doc._id},
                            {$set: {'property.topCounter':
                                    postPropObj.topCounter}},
                            {w: 0}
                        );
                    }
                    if (doc.property['draftCounter']) {
                        collection.update(
                            {_id: doc._id},
                            {$inc: {'property.draftCounter':
                                    postPropObj.draftCounter}},
                            {w: 0}
                        );
                    } else if (postPropObj.draftCounter >= 0) {
                        collection.update(
                            {_id: doc._id},
                            {$set: {'property.draftCounter':
                                    postPropObj.draftCounter}},
                            {w: 0}
                        );
                    }
                } else {
                    collection.insert(
                        {property: {
                            'topCounter':
                            (!postPropObj.topCounter || postPropObj.topCounter < 0) ? 0 : postPropObj.topCounter,
                            'postCounter':
                            (!postPropObj.postCounter || postPropObj.postCounter < 0) ? 0 : postPropObj.postCounter,
                            'ppostCounter':
                            (!postPropObj.ppostCounter || postPropObj.ppostCounter < 0) ? 0 : postPropObj.ppostCounter,
                            'draftCounter':
                            (!postPropObj.draftCounter || postPropObj.draftCounter < 0) ? 0 : postPropObj.draftCounter
                        }},
                        {w: 0}
                    );
                }
                db.close();
                callback(null);
            });
        });
    });

};

Post.postNew = function(post, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.createCollection('post', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.insert(post, {safe: true}, function(err, doc) {
                db.close();
                callback(err, doc);
            });
        });
    });

};

Post.userAddPid = function(authorid, postid, state, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('user', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            if (state === pstate.draft) {
                collection.update(
                    {_id: authorid},
                    {$push: {draftid: postid}},
                    {w: 0}
                );
            }
            if (state === pstate.post || state === pstate.ontop) {
                collection.update(
                    {_id: authorid},
                    {$push: {postid: postid}},
                    {w: 0}
                );
            }
            if (state === pstate.ppost ||
                (state === pstate.ppost + pstate.ontop)) {
                collection.update(
                    {_id: authorid},
                    {$push: {ppostid: postid}},
                    {w: 0}
                );
            }
            db.close();
            callback();
        });
    });

};

Post.tagAddPid = function(tagIdArr, postid, state, callback) {

    if (state===pstate.draft) { // do nothing
        return callback();
    }
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('tag', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            if (state === pstate.post || state === pstate.ontop) {
                collection.update(
                    {_id: {$in: tagIdArr}},
                    {$push: {postid: postid}},
                    {w: 0, multi: true},
                    function (err) {
                        db.close();
                        callback();
                    });
            }
            if (state === pstate.ppost ||
                (state === pstate.ppost + pstate.ontop)) {
                collection.update(
                    {_id: {$in: tagIdArr}},
                    {$push: {ppostid: postid}},
                    {w: 0, multi: true},
                    function (err) {
                        db.close();
                        callback();
                    });    
            }
        });
    });

};

Post.catAddPid = function(cat, postid, state, callback) {

    if (state===pstate.draft) { // do nothing
        return callback();
    }
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('category', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var i = 0, len = cat.length;
            cat.forEach(function(el) {
                if (state === pstate.post || state === pstate.ontop) {
                    collection.update(
                        {_id: el},
                        {$push: {postid: postid}},
                        {w: 0}
                    );
                }
                if (state === pstate.ppost ||
                    (state === pstate.ppost + pstate.ontop)) {
                    collection.update(
                        {_id: el},
                        {$push: {ppostid: postid}},
                        {w: 0}
                    );
                }
                if (++i === len) {
                    db.close();
                    callback();
                }
            });
        });
    });

};

Post.delPostsById = function(pidArr, userObj, callback) {
// userObj: {_id: objectid, level: userlevel}

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('post').find(
            {_id: {$in: pidArr}},
            {content: 0}
        ).toArray(function(err, docs) {
            if (err) {
                db.close();
                return callback(err);
            }
            var tag = [];
            var cat = [];
            var author = [];
            var postProp = {
                postCounter: 0,
                ppostCounter: 0,
                topCounter: 0,
                draftCounter: 0
            };
            var commentid = [];
            var count = 0, len = docs.length;
            docs.forEach(function(el) {

                if (userObj) {
                    switch (true) {
                    case userObj.level === ul.author &&
                            userObj._id !== el.authorid.toString():
                    case userObj._id !== el.authorid.toString() &&
                            el.level && userObj.level <= el.level:
                        db.close();
                        return callback('no privilege');
                    }
                }
                
                if (el.commentid && el.commentid.length) {
                    commentid.concat(el.commentid);
                }
                if (el.state === pstate.post) {
                    ++postProp.postCounter;
                } else if (el.state === pstate.ppost) {
                    ++postProp.ppostCounter;
                } else if (el.state !== pstate.draft) {
                    ++postProp.topCounter;
                } else {
                    ++postProp.draftCounter;
                }
                if (el.tagid && el.tagid.length &&
                    el.state !== pstate.draft) {
                    var t = {id: [], pid: '', ppid: ''};
                    t.id = el.tagid;
                    if (el.state === pstate.ppost ||
                        el.state === (pstate.ppost + pstate.ontop)) {
                        t.ppid = el._id;
                    } else {
                        t.pid = el._id;
                    }
                    tag.push(t);
                }
                if (el.catid && el.catid.length &&
                    el.state !== pstate.draft) {
                    var c = {id: [], pid: '', ppid: ''};
                    c.id = el.catid;
                    if (el.state === pstate.ppost ||
                        el.state === (pstate.ppost + pstate.ontop)) {
                        c.ppid = el._id;
                    } else {
                        c.pid = el._id;
                    }
                    cat.push(c);
                }
                if (el.authorid) {
                    var a = {id: '', pid: '', ppid: '', draftid: ''};
                    a.id = el.authorid;
                    if (el.state === pstate.ppost ||
                        el.state === (pstate.ppost + pstate.ontop)) {
                        a.ppid = el._id;
                    } else if (el.state !== pstate.draft) {
                        a.pid = el._id;
                    } else {
                        a.draftid = el._id;
                    }
                    author.push(a);
                }
                
                if (++count === len) {
                    if (postProp.postCounter) {
                        db.collection('post').update(
                            {property: {$exists: true}},
                            {$inc: {"property.postCounter":
                                    -postProp.postCounter}},
                            {w: 0}
                        );
                    }
                    if (postProp.ppostCounter) {
                        db.collection('post').update(
                            {property: {$exists: true}},
                            {$inc: {"property.ppostCounter":
                                    -postProp.ppostCounter}},
                            {w: 0}
                        );
                    }
                    if (postProp.topCounter) {
                        db.collection('post').update(
                            {property: {$exists: true}},
                            {$inc: {"property.topCounter":
                                    -postProp.topCounter}},
                            {w: 0}
                        );
                    }
                    if (postProp.draftCounter) {
                        db.collection('post').update(
                            {property: {$exists: true}},
                            {$inc: {"property.draftCounter":
                                    -postProp.draftCounter}},
                            {w: 0}
                        );
                    }
                    db.collection('post').remove(
                        {_id: {$in: pidArr}},
                        {w: 0}
                    );
                    var n, cl = commentid.length;
                    if (cl) {
                        db.collection('comment').update(
                            {_id: {$in: commentid}},
                            {$set: {content: '抱歉：您的這條評論不見了，因爲您所評論的該篇文章已經被刪掉了'}},
                            function(err, doc) {
                                db.close();
                                callback(err, tag, cat, author);
                            });
                        
                    } else {
                        db.close();
                        callback(null, tag, cat, author);
                    }
                }
            });
        });
    });
    
}

Post.tagDelPid = function(objArr, callback) {

    var count = 0, len = objArr.length;
    if (len) {
        mongodb.open(function(err, db) {
            if (err) {
                return callback(err);
            }
            objArr.forEach(function(el) {
                if (el.pid !== '') {
                    db.collection('tag').update(
                        {_id: {$in: el.id}},
                        {$pull: {postid: el.pid}},
                        {w: 0, multi: true}
                    );
                }
                if (el.ppid !== '') {
                    db.collection('tag').update(
                        {_id: {$in: el.id}},
                        {$pull: {ppostid: el.ppid}},
                        {w: 0, multi: true}
                    );
                }
                if (++count === len) {
                    db.close();
                    callback(null);
                }
            });
        });
    } else { callback(null); }
    
};

Post.edit = function(pid, updateObj, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return res.send(err);
        }
        db.collection('post').update(
            {_id: pid}, {$set: updateObj},
            function(err, result) {
                callback(err, result);
            });
    });
    
};

Post.count = function(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return res.send(err);
        }
        db.collection('post').findOne(
            {property: {$exists: true}},
            function(err, doc) {
                db.close();
                callback(err, doc);
            });
    });
    
};