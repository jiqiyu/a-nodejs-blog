var mongodb = require('./db');
var ObjectId = require('mongodb').ObjectID;
var ul = require('../conf').userLevel;
var limit = require('../conf').limit;
var pstate = require('../conf').postState;

function Category(/* category */) {/*
    
    this.name = category.name;
    this.depth = category.depth; // (number)
    this.haschildren = category.haschildren; // (boolean)
    [this.default = post.default;] // (boolean)
    [this.postid = [];]
    [this.ppostid = [];]
    [this.parent = category.parent;]
    [this.description = category.description;]
    
*/};

module.exports = Category;

Category.tree = function tree(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('category', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var rootleaf = [];
            var leaf = {};
            var parent = {};
            var child = {};
            var count = 0;
            var depth = 0;
            collection.find().toArray(function(err, catArr) {
                if (err) {
                    db.close();
                    callback(err);
                }
                var len = catArr.length;
                if (len === 0) {
                    db.close();
                    return callback(null, len);
                }
                var obj = {'parentId': []};
                var space = '';
                catArr.forEach(function(item) {
                    depth = (item && (item.depth > depth)) ? item.depth : depth;
                    space = new Array(item.depth + 1).join('&nbsp;&nbsp;&nbsp;&nbsp;');
                    item.space = space;
                    item.nselfpost = item.postid ? item.postid.length : 0;
                    if ((item.depth === 0) && !item.haschildren) {
                        rootleaf.push(item);
                    }
                    if (item.haschildren) {
                        item.subcat = {}
                        item.subcat.name = [];
                        item.subcat.id = [];
                        item.subcat.depth = item.depth + 1;
                        parent[item.depth] = parent[item.depth] ? parent[item.depth] : {};
                        parent[item.depth][item._id] = item;
                        parent[item.depth].siblingCount = parent[item.depth].siblingCount || 0;
                        ++parent[item.depth].siblingCount;
                        obj.parentId.push(item._id);
                        obj[item._id] = item;
                    } else {
                        if (item.parent) {
                            leaf[item.parent] = leaf[item.parent] ? leaf[item.parent] : [];
                            leaf[item.parent].push(item);
                        }
                    }
                    if (++count === len) {
                        collection.find({parent: {$in: obj.parentId}}).toArray(function(err, docs) {
                            db.close();
                            var n = 0, dlen = docs.length;
                            if (dlen === 0) {
                                callback(null, count, depth, rootleaf, parent, child, leaf);
                            }
                            docs.forEach(function(it) {
                                // if (obj[it.parent]) {
                                    space = new Array(it.depth + 1).join('&nbsp;&nbsp;&nbsp;&nbsp;');
                                    child[obj[it.parent]._id] = child[obj[it.parent]._id] || {};
                                    parent[obj[it.parent].depth][obj[it.parent]._id].subcat.name.push(it.name);
                                    parent[obj[it.parent].depth][obj[it.parent]._id].subcat.id.push(it._id);
                                    parent[obj[it.parent].depth][obj[it.parent]._id].subcat.depth = it.depth;
                                    child[obj[it.parent]._id].subcat =
                                        parent[obj[it.parent].depth][obj[it.parent]._id].subcat;
                                    child[obj[it.parent]._id][it._id] = it;
                                    if (it.haschildren) {
                                        child[obj[it.parent]._id][it._id].subcat = parent[it.depth][it._id].subcat;
                                    }
                                    child[obj[it.parent]._id][it._id].space = space;
                                    var plen = child[obj[it.parent]._id][it._id].postid ?
                                        child[obj[it.parent]._id][it._id].postid.length : 0;
                                    // var pplen = child[obj[it.parent]._id][it._id].ppostid ?
                                    //     child[obj[it.parent]._id][it._id].ppostid.length : 0;
                                    child[obj[it.parent]._id][it._id].nselfpost = plen; // + pplen;
                                    child[obj[it.parent]._id].npost = child[obj[it.parent]._id].npost || 0;
                                    child[obj[it.parent]._id].npost += child[obj[it.parent]._id][it._id].nselfpost;
                                    parent[obj[it.parent].depth][obj[it.parent]._id].nsub = child[obj[it.parent]._id].npost;
                                    if (obj[it.parent].parent &&
                                        child[obj[obj[it.parent].parent]._id] &&
                                        child[obj[obj[it.parent].parent]._id][obj[it.parent]._id]) {
                                        child[obj[obj[it.parent].parent]._id][obj[it.parent]._id].nsub =
                                            parent[obj[it.parent].depth][obj[it.parent]._id].nsub;
                                    }
                                    if (child[obj[it.parent]._id][it._id].haschildren) {
                                        parent[it.depth][it._id].nselfpost =
                                            child[obj[it.parent]._id][it._id].nselfpost;
                                    }
                                // }
                                if (++n === dlen) {
                                    callback(null, count, depth, rootleaf, parent, child, leaf);
                                }
                            });
                        });
                    }
                });
            });
        });
    });

};

Category.countPosts = function countPosts(parentNodeObj, childNodeObj, depth) {

    if (depth > 0) {
        for (var item in parentNodeObj[depth - 1]) {
            if (item !== 'siblingCount') {
                if (parentNodeObj[depth - 1].hasOwnProperty(item)) {
                    parentNodeObj[depth - 1][item].npost = parentNodeObj[depth - 1][item].nselfpost +
                        parentNodeObj[depth - 1][item].nsub;
                }
                if (depth - 2 >= 0) {
                    for (var key in parentNodeObj[depth - 2]) {
                        if (key !== 'siblingCount' &&
                            parentNodeObj[depth - 2].hasOwnProperty(key)) {
                            for (var n in childNodeObj[key]) {
                                if (item === n) {
                                    childNodeObj[key].subcat.name =
                                        childNodeObj[key].subcat.name.concat(childNodeObj[item].subcat.name);
                                    childNodeObj[key].subcat.id =
                                        childNodeObj[key].subcat.id.concat(childNodeObj[item].subcat.id);
                                    childNodeObj[key].subcat.depth = childNodeObj[item].subcat.depth;
                                    parentNodeObj[depth - 2][key].subcat = childNodeObj[key].subcat;
                                }
                            }
                            if (parentNodeObj[depth - 2][key]._id.toString() ===
                                parentNodeObj[depth - 1][item].parent.toString()) {
                                parentNodeObj[depth - 2][key].nsub += parentNodeObj[depth - 1][item].nsub;
                                parentNodeObj[depth - 2][key].npost = parentNodeObj[depth - 2][key].nselfpost +
                                    parentNodeObj[depth - 2][key].nsub;
                                // childNodeObj[key][item] is parentNodeObj[depth - 1][item] itself,
                                // so adjust properties of theirs to the same value:
                                childNodeObj[key][item].npost = parentNodeObj[depth - 1][item].npost;
                                childNodeObj[key][item].nselfpost = parentNodeObj[depth - 1][item].nselfpost;
                                childNodeObj[key][item].nsub = parentNodeObj[depth - 1][item].nsub;
                                childNodeObj[key][item].subcat = parentNodeObj[depth - 1][item].subcat;
                            }
                        }
                    }
                }
            }
        }
        countPosts(parentNodeObj, childNodeObj, --depth);
    }

};

Category.walk = function walk(parentNodeObj, childNodeObj, leafObj, level, depth, retArr) {
    
    // console.log('--parent----------------');
    // console.log(parentNodeObj);
    // console.log('--child----------------');
    // console.log(childNodeObj);
    // console.log('--leafObj----------------');
    // console.log(leafObj);
    // console.log('--level---depth---' + level + '---' + depth + '-----');

    var count = parentNodeObj[0].siblingCount;
    for (var k in parentNodeObj[level]) {
        if (parentNodeObj[0].siblingCount < count &&
            parentNodeObj[0].siblingCount > 0) {
            level = 0;
        }
        if (k !== 'siblingCount' &&
            parentNodeObj[level].hasOwnProperty(k)) {
            if (!parentNodeObj[level][k].parent) {
                --parentNodeObj[0].siblingCount;
                retArr.push(parentNodeObj[level][k]);
                parentNodeObj[level][k].flag = true;
                if (leafObj[parentNodeObj[level][k]._id]) {
                    leafObj[parentNodeObj[level][k]._id].forEach(
                        function(el) {
                            retArr.push(el);
                        });
                }
            }
        }
        if (level < depth) {
            for (var key in childNodeObj[k]) {
                if (key !== 'npost' &&
                    key !== 'subcat' &&
                    k !== 'siblingCount' &&
                    childNodeObj[k].hasOwnProperty(key)) {
                    if (childNodeObj[k][key].haschildren) {
                        // if current node has already been pushed, cancel it
                        // if current node's parent node hasn't been pushed, cancel it
                        if (!childNodeObj[k][key].flag &&
                            parentNodeObj[childNodeObj[k][key].depth - 1][k].flag) {
                            retArr.push(childNodeObj[k][key]);
                            childNodeObj[k][key].flag = true;
                            parentNodeObj[childNodeObj[k][key].depth][key].flag = true;
                            var chCount = 0, leafCount = 0;
                            for (var ch in childNodeObj[key]) {
                                if (ch !== 'npost' && ch !== 'subcat' &&
                                    childNodeObj[key].hasOwnProperty(ch)) {
                                    ++chCount;
                                    if (!childNodeObj[key][ch].haschildren) {
                                        ++leafCount;
                                    }
                                }
                            }
                            if (leafCount) {
                                leafObj[childNodeObj[k][key]._id].forEach(function(el) {
                                    retArr.push(el);
                                });
                            }
                            if (leafCount < chCount) {
                                ++level
                                walk(parentNodeObj, childNodeObj,
                                     leafObj, childNodeObj[k][key].depth,
                                     childNodeObj[k][key].subcat.depth,
                                     retArr);
                            }
                        }
                    }
                }
            }
        }
    }
    return retArr;
    
};

Category.catNew = function catNew(cat, parentidArr, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.createCollection('category', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            if (typeof cat === 'object') {
                var catname;
                if (Array.isArray(cat)) {
                    var i, cl = cat.length;
                    for (i=0; i<cl; i++) {
                        catname = catname || [];
                        catname[i] = cat[i].name;
                    }
                    var selector = {name: {$in: catname}};
                } else {
                    var selector = {name: cat.name};
                }
                collection.find(selector).toArray(function(err, docs) {
                    var count = 0, len = docs.length;
                    if (!len) {
                        collection.insert(
                            cat,
                            {safe: true},
                            function(err, doc) {
                                var newcatid = doc[0]._id;
                                collection.update(
                                    {_id: {$in: parentidArr}},
                                    {$set: {haschildren: true}},
                                    {w: 0, multi: true}
                                );
                                db.close();
                                callback(err, newcatid);
                            });
                    } else {
                        docs.forEach(function(el, idx) {
                            if (catname) {
                                for (i=0; i<cl; i++) {
                                    if (el.name === cat[i].name) {
                                        if (el.depth !== cat[i].depth) {
                                            db.close();
                                            return callback('分類名重複了');
                                        }
                                        if (el.depth === cat[i].depth) {
                                            if (!el.parent ||
                                                el.parent.toString() === cat[i].parent.toString()) {
                                                db.close();
                                                return callback('分類名重複了');
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (el.depth !== cat.depth) {
                                    db.close();
                                    return callback('分類名重複了');
                                }
                                if (el.depth === cat.depth) {
                                    if (!el.parent ||
                                        el.parent.toString() === cat.parent.toString()) {
                                        db.close();
                                        return callback('分類名重複了');
                                    }
                                }
                            }
                            if (++count === len) {
                                collection.insert(
                                    cat,
                                    {safe: true},
                                    function(err, doc) {
                                        collection.update(
                                            {_id: {$in: parentidArr}},
                                            {$set: {haschildren: true}},
                                            {w: 0, multi: true}
                                        );
                                        db.close();
                                        callback(err, doc[0]._id); /////////////////////////////doc[N]._id
                                    });
                            }
                        });
                    }
                });
            } else {
                db.close();
                return callback('type error');
            }
            
        });
    });

};

Category.getPostsInCategory = function getPostsInCategory(catIdArr, callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        var cursor = db.collection('category').find(
            {_id: {$in: catIdArr}},
            {postid: 1, ppostid: 1}
        );
        var pid = [];
        cursor.each(function(err, item) {
            if (err) {
                db.close();
                callback(err);
            }
            if (item === null) {
                if (pid.length) {
                    cursor = db.collection('post').find(
                        {_id: {$in: pid}},
                        {content: 0}
                    );
                    cursor.toArray(function(err, docs) {
                        db.close();
                        callback(err, docs);
                    });
                } else {
                    db.close();
                    callback(err, null);
                }
            } else {
                if (item.postid) {
                    pid = pid.concat(item.postid);
                }
                if (item.ppostid) {
                    pid = pid.concat(item.ppostid);
                }
            }
        });
    });

};

Category.change = function(fromCatIdArr, toCatId, pidObjArr, callback) {
/* pidObjArr - [{pid: Objectid(***), state: number, formerState: number}, ..., {...}] */
    
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        var count = 0;
        var len = pidObjArr.length;
        var pid = [];
        var ppid = [];
        var fpid = [];
        var fppid = [];
        pidObjArr.forEach(function(el) {
            switch (+el.state) {
            case pstate.post:
            case pstate.ontop:
                pid.push(el.pid);
                break;
            case pstate.ppost + pstate.ontop:
            case pstate.ppost:
                ppid.push(el.pid);
                break;
            default:
                return console.log('heeeeeeeeeeere: ' + field + pstate.post);
            }
            switch (+el.formerState) {
            case pstate.post:
            case pstate.ontop:
                fpid.push(el.pid);
                break;
            case pstate.ppost + pstate.ontop:
            case pstate.ppost:
                fppid.push(el.pid);
                break;
            }
            if (++count === len) {
                db.collection('category').update(
                    {'_id': toCatId},
                    {$push: {'postid': {$each: pid}}},
                    {multi: true, w: 0},
                    function(err, result) {
                        if (err) { console.log('!error! category.js line #419'); }
                        db.collection('category').update(
                            {'_id': toCatId},
                            {$push: {'ppostid': {$each: ppid}}},
                            {multi: true, w: 0},
                            function(err, result) {
                                if (err) { console.log('!error! category.js line #425'); }
                                db.collection('category').update(
                                    {'_id': {$in: fromCatIdArr}},
                                    {$pullAll: {'postid': fpid}},
                                    {multi: true, w: 0},
                                    function(err, result) {
                                        if (err) { console.log('!error! category.js line #431'); }
                                        db.collection('category').update(
                                            {'_id': {$in: fromCatIdArr}},
                                            {$pullAll: {'ppostid': fppid}},
                                            {multi: true, w: 0},
                                            function(err, result) {
                                                db.close();
                                                callback(err, result);
                                            });
                                    });
                            });
                    });
            }
        });
    });

};

Category.delPid = function(objArr, callback) {

    var count = 0, len = objArr.length;
    if (len) {
        mongodb.open(function(err, db) {
            if (err) {
                return callback(err);
            }
            objArr.forEach(function(el) {
                if (el.pid !== '') {
                    db.collection('category').update(
                        {_id: {$in: el.id}},
                        {$pull: {postid: el.pid}},
                        {w: 0, multi: true}
                    );
                }
                if (el.ppid !== '') {
                    db.collection('category').update(
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

Category.edit = function(obj, callback) {

    if (obj.parent) {
        var p = obj.parent === 'nil' ? null :
            obj.parent.split(',')[0];
        var pdepth = p ? +obj.parent.split(',')[1] : -1;
    }

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        if (obj.description !== undefined) {
            db.collection('category').update(
                {'_id': ObjectId(obj.catid)},
                {$set: {'description': obj.description}},
                function(err) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    if (!obj.parent && !obj.catname) {
                        console.log('here');
                        db.close();
                        callback(null, {'description': obj.description});
                    }
                });
        }
        db.collection('category').find({'name': obj.catname})
            .toArray(function(err, docs) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                var i, l = docs.length;
                if (l) {
                    for (i=0; i<l; i++) {
                        if ((docs[i].depth === +obj.depth &&
                             docs[i].depth !== 0) &&
                            docs[i].parent.toString() !== p) {
                            continue;
                        }
                        db.close();
                        return callback('錯誤：重複的分類名');
                    }
                }
                if ((obj.catname && !l) || l) {
                    db.collection('category').update(
                        {'_id': ObjectId(obj.catid)},
                        {$set: {'name': obj.catname}},
                        function(err) {
                            if (err) {
                                db.close();
                                return callback(err);
                            }
                            if (p === undefined) {
                                db.close();
                                callback(err, {
                                    'catname': obj.catname,
                                    'depth': obj.formerDepth,
                                    'parentid': obj.formerParentid || 'undefined',
                                    'description': obj.description || 'undefined',
                                    'catid': obj.catid,
                                    'subcatidArr': obj.subcatidArr ?
                                        obj.subcatidArr.join(',') : 'undefined'
                                });
                            }
                        });
                }
                if (p !== undefined) {
                    var dValue = pdepth - (obj.formerDepth ?
                                            obj.formerDepth - 1 : 0);
                    if (obj.formerParentid) {
                        db.collection('category').count(
                            {'parent': ObjectId(obj.formerParentid)},
                            function(err, n) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                if (n === 1) {
                                    db.collection('category').update(
                                        {'_id': ObjectId(obj.formerParentid)},
                                        {$set: {'haschildren': false}},
                                        function(err) {
                                            if (err) {
                                                db.close();
                                                return callback(err);
                                            }
                                        });
                                }
                            });
                    }
                    if (p) {
                        var document = {$set:
                                        {'parent': ObjectId(p),
                                         'depth': pdepth + 1
                                        }};
                        db.collection('category').update(
                            {'_id': ObjectId(p)},
                            {$set: {'haschildren': true}},
                            function(err) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }           
                            });
                    } else {
                        var document = {$set: {'depth': 0},
                                        $unset: {'parent': ''}};
                    }
                    if (obj.subcatidArr) {
                        var ii, ll = obj.subcatidArr.length;
                        for (ii=0; ii<ll; ii++) {
                            obj.subcatidArr[ii] =
                                ObjectId(obj.subcatidArr[ii]);
                        }
                    }
                    db.collection('category').update(
                        {'_id': ObjectId(obj.catid)},
                        document,
                        function(err) {
                            if (err) {
                                db.close();
                                return callback(err);
                            }
                            if (dValue && obj.subcatidArr) {
                                db.collection('category').update(
                                    {'_id': {$in: obj.subcatidArr}},
                                    {$inc: {'depth': dValue}},
                                    {multi: true},
                                    function(err) {
                                        db.close();
                                        callback(err, {'refresh': true});
                                    });
                            } else {
                                db.close();
                                callback(err, {'refresh': true});
                            }
                        });
                }
            });
    });
    
};

Category.del = function(catIdArr, subcatIdArr, callback) {
/* subcatIdArr: [[subcatId1, subcatId2, ...], [subcatId1, subcatId2, ...], ...] */

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        var idx = 0, subcat = [], pid = [], cl = catIdArr.length;
        var pidObjArr = []; // for later use, pass it to Category.change
        db.collection('category').findOne({'isdefault': true}, function(err, dcat) {
            if (err) {
                db.close();
                return callback('Error: cannot find default category');
            }
            catIdArr.forEach(function(el) {
                db.collection('category').findOne({_id: el}, function(err, doc) {
                    if (doc.isdefault) {
                        db.close();
                        return callback('You cannot delete the default category');
                    }
                    subcat = subcatIdArr[idx];
                    pid = doc.postid || [];
                    pid = doc.ppostid ? pid.concat(doc.ppostid) : pid;
                    // move posts to the default category
                    if (pid.length) {
                        db.collection('post').find(
                            {'_id': {$in: pid}},
                            {'content': 0, 'original': 0}
                        ).each(function(err, it) {
                            if (it !== null) {
                                if (!it.catid || !it.catid.length ||
                                    it.catid.length === 1) {
                                    db.collection('post').update(
                                        {'_id': it._id},
                                        {$set: {'catid': [dcat._id]}},
                                        function(err) {
                                            var obj = {};
                                            obj.pid = it._id;
                                            obj.state = it.state;
                                            obj.formerState = it.state;
                                            pidObjArr.push(obj);
                                        });
                                } else {
                                    db.collection('post').update(
                                        {'_id': it._id},
                                        {$pull: {'catid': el}},
                                        function(err) {
                                            var obj = {};
                                            obj.pid = it._id;
                                            obj.state = it.state;
                                            obj.formerState = it.state;
                                            pidObjArr.push(obj);
                                        });
                                }
                            }
                        });
                    }
                    if (doc.haschildren && doc.parent) {
                        // change its children to its parent's children
                        db.collection('category').update(
                            {'parent': doc._id},
                            {$set: {'parent': doc.parent}},
                            {multi: true},
                            function(err) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                // decrease its subcats' depth by 1
                                db.collection('category').update(
                                    {'_id': {$in: subcat}},
                                    {$inc: {'depth': -1}},
                                    {multi: true},
                                    function(err, result) {
                                        if (err) {
                                            db.close();
                                            return callback(err);
                                        }
                                        // delete
                                        db.collection('category').remove(
                                            {'_id': doc._id}, {w: 1},
                                            function(err) {
                                                if (err) {
                                                    db.close();
                                                    return callback(err);
                                                }
                                                if (++idx >= cl) {
                                                    db.close();
                                                    callback(null,
                                                             dcat._id,
                                                             pidObjArr);
                                                }
                                            });
                                    });
                            });

                    } else if (doc.haschildren) {
                        // unset the children's parent field
                        db.collection('category').update(
                            {'parent': doc._id},
                            {$unset: {'parent': ''}},
                            {multi: true},
                            function(err) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                // decrease its subcats' depth by 1
                                db.collection('category').update(
                                    {'_id': {$in: subcat}},
                                    {$inc: {'depth': -1}},
                                    {multi: true},
                                    function(err) {
                                        if (err) {
                                            db.close();
                                            return callback(err);
                                        }
                                        db.collection('category').remove(
                                            {'_id': doc._id}, {w: 1},
                                            function(err) {
                                                if (err) {
                                                    db.close();
                                                    return callback(err);
                                                }
                                                if (++idx >= cl) {
                                                    db.close();
                                                    callback(null,
                                                             dcat._id,
                                                             pidObjArr);
                                                }
                                            });
                                    });
                            });
                    } else if (doc.parent) {
                        // check if its parent has other children,
                        // if yes, just delete current category
                        // if no, set its parent's haschildren field to false
                        db.collection('category').count(
                            {'parent': doc.parent},
                            function(err, count) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                if (count > 1) {
                                    db.collection('category').remove(
                                        {'_id': doc._id}, {w: 1},
                                        function(err) {
                                            if (err) {
                                                db.close();
                                                return callback(err);
                                            }
                                            if (++idx >= cl) {
                                                db.close();
                                                callback(null,
                                                         dcat._id,
                                                         pidObjArr);
                                            }
                                        });
                                } else {
                                    db.collection('category').update(
                                        {'_id': doc.parent},
                                        {$set: {'haschildren': false}},
                                        function(err) {
                                            if (err) {
                                                db.close();
                                                return callback(err);
                                            }
                                            db.collection('category').remove(
                                                {'_id': doc._id}, {w: 1},
                                                function(err) {
                                                    if (err) {
                                                        db.close();
                                                        return callback(err);
                                                    }
                                                    if (++idx >= cl) {
                                                        db.close();
                                                        callback(null,
                                                                 dcat._id,
                                                                 pidObjArr);
                                                    }
                                                });
                                        });
                                }
                            });
                    } else {
                        // delete
                        db.collection('category').remove(
                            {'_id': doc._id}, {w: 1},
                            function(err) {
                                if (err) {
                                    db.close();
                                    return callback(err);
                                }
                                if (++idx >= cl) {
                                    db.close();
                                    callback(null, dcat._id, pidObjArr);
                                }
                            });
                    }
                });
            });
        });
    });
    
};

Category.count = function(callback) {

    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('category').count(function(err, count) {
            db.close();
            callback(err, count);
        });
    });
    
};