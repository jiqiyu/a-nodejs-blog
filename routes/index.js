/*
 * GET home page
 */

// var url = require('url');
var ObjectId = require('mongodb').ObjectID;

var ul = require('../conf').userLevel;
var limit = require('../conf').limit;
var postsMoreThan = require('../conf').tagcloud.postsMoreThan;
var pstate = require('../conf').postState;
var Post = require('../models/post');
var Category = require('../models/category');
var Tag = require('../models/tag');
var User = require('../models/user');
var Fn = require('../models/func');

var db = require('../models/db');
db.recount();

var pageInfo = null;

var isCacheOn = function() {

    if (__indexCache !== -1) {
        __indexCache = __indexCache || {};
        return true;
    }
    return false;
    
};

//////// get ip: req.connection.remoteAddress

exports.reqBegin = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    req.jiqiyu.reqBegin = new Date().getTime();
    next();
    
}

exports.checkAppointment = function(req, res, next) {

    // check cache
    if (isCacheOn() && __indexCache.appointPosts !== undefined) {
        var aptCacheArr = undefined;
        var formerIdsArr = [];
        var postsArr = [];
        var now = Date.now();
        var aptLen = __indexCache.appointPosts ?
            __indexCache.appointPosts.length : 0;
        for (var n=0; n<aptLen; n++) {
            var p = __indexCache.appointPosts[n];
            var at = p.appointed_time;
            if (at <= now) {
                var timestamp = Math.floor(at/1000);
                formerIdsArr.push(p._id);
                p._id = ObjectId(timestamp);
                if (p.isprivate && p.ontop) {
                    p.state = pstate.ppost + pstate.ontop;
                } else if (p.isprivate) {
                    p.state = pstate.ppost;
                } else if (p.ontop) {
                    p.state = pstate.ontop;
                } else {
                    p.state = pstate.post;
                }
                postsArr.push(p);
                // __indexCache.appointPosts.splice(n, 1);
            }
        }
        if (postsArr.length &&
            (formerIdsArr.length === postsArr.length)) {
            __indexCache = undefined;
            Post.postNew(postsArr, function(err, docs) {
                if (err) {
                    console.log('####error#### index.js #42,37');
                    next();
                }
                Post.delPostsById(formerIdsArr, null, function(err, tag,
                                                               cat, author) {
                    User.delPid(author, function(err) {
                        var postProp = {
                            postCounter: 0,
                            ppostCounter: 0,
                            topCounter: 0,
                            draftCounter: 0
                        };
                        var i = 0, len = postsArr.length;
                        postsArr.forEach(function(el) {
                            Post.tagAddPid(
                                el.tagid, el._id, el.state,
                                function(err) {
                                    if (err) {
                                        console.log('####error#### index.js #60,75');
                                    }
                                });
                            Post.catAddPid(
                                el.catid, el._id, el.state,
                                function(err) {
                                    if (err) {
                                        console.log('####error#### index.js #67,80');
                                    }
                                });
                            Post.userAddPid(
                                el.authorid, el._id, el.state,
                                function(err) {
                                    if (err) {
                                        console.log('####error#### index.js #74,79');
                                    }
                                });
                            // increase counter because of the Post.postnew action
                            if ((el.state === pstate.ontop) ||
                                (el.state === pstate.ppost + pstate.ontop)) {
                                ++postProp.topCounter;
                            }
                            if (el.state === pstate.post) {
                                ++postProp.postCounter;
                            }
                            if (el.state === pstate.draft) {
                                // ++postProp.draftCounter;
                            }
                            if (el.state === pstate.ppost) {
                                // || el.state === pstate.ppost + pstate.ontop) {
                                ++postProp.ppostCounter;
                            }
                            if (++i === len) {
                                Post.upsProperty(postProp, function(err) {
                                    if (err) {
                                        console.log('####error#### index.js #95,80');
                                    }
                                    next();
                                });
                            }
                        });
                    });
                });
            });
        } else { next(); }
    } else {
        
        Post.checkAppointment(function(err, aptCacheArr, formerIdsArr, postsArr) {
            if (err) {
                return res.send(err);
            }
            var fl = formerIdsArr.length;
            var pl = postsArr.length;

            if (aptCacheArr !== undefined &&
                aptCacheArr.length !== pl &&
                isCacheOn()) {
                __indexCache.appointPosts = aptCacheArr;
            } else if (aptCacheArr !== undefined && isCacheOn()) {
                __indexCache.appointPosts = null;
            }
            
            if (!fl || !pl) { next(); }
            
            if (pl && (fl === pl)) {
                Post.postNew(postsArr, function(err, docs) {
                    if (err) {
                        console.log('####error#### index.js #42,37');
                        next();
                    }
                    Post.delPostsById(formerIdsArr, null, function(err, tag,
                                                                   cat, author) {
                        User.delPid(author, function(err) {
                            var postProp = {
                                postCounter: 0,
                                ppostCounter: 0,
                                topCounter: 0,
                                draftCounter: 0
                            };
                            var i = 0, len = postsArr.length;
                            postsArr.forEach(function(el) {
                                Post.tagAddPid(
                                    el.tagid, el._id, el.state,
                                    function(err) {
                                        if (err) {
                                            console.log('####error#### index.js #60,75');
                                        }
                                    });
                                Post.catAddPid(
                                    el.catid, el._id, el.state,
                                    function(err) {
                                        if (err) {
                                            console.log('####error#### index.js #67,80');
                                        }
                                    });
                                Post.userAddPid(
                                    el.authorid, el._id, el.state,
                                    function(err) {
                                        if (err) {
                                            console.log('####error#### index.js #74,79');
                                        }
                                    });
                                // increase counter because of the Post.postnew action
                                if ((el.state === pstate.ontop) ||
                                    (el.state === pstate.ppost + pstate.ontop)) {
                                    ++postProp.topCounter;
                                }
                                if (el.state === pstate.post) {
                                    ++postProp.postCounter;
                                }
                                if (el.state === pstate.draft) {
                                    // ++postProp.draftCounter;
                                }
                                if (el.state === pstate.ppost) {
                                    // || el.state === pstate.ppost + pstate.ontop) {
                                    ++postProp.ppostCounter;
                                }
                                if (++i === len) {
                                    Post.upsProperty(postProp, function(err) {
                                        if (err) {
                                            console.log('####error#### index.js #95,80');
                                        }
                                        next();
                                    });
                                }
                            });
                        });
                    });
                });
            }
            if (fl !== pl) {
                console.log('something wrong with checkAppointment');
                next();
            }
        });
    }
    
};

exports.getOnTop = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    req.jiqiyu.ontop = [];

    req.jiqiyu.user = req.session.user || {};

    // check cache
    if (isCacheOn() && __indexCache.topPosts !== undefined) {
        req.jiqiyu.ontop = __indexCache.topPosts;
        next();
    } else {

        if (!pageInfo) {
            pageInfo = {};
        }
        Post.getOnTop(function(err, docs) {
            if (err) {
                return res.send(err);
            }
            var i = 0, len = docs.length;
            if (len) {
                docs.forEach(function(el) {
                    el.date = el._id.getTimestamp().toDateString();
                    el.time = el._id.getTimestamp().toLocaleTimeString();
                    if (el.state == pstate.ontop) {
                        if (el.more === undefined && limit.less >= 0) {
                            if (el.content.length > limit.less) {
                                el.readmore = limit.less;
                                el.subcontent =
                                    el.original.substr(0, limit.less);
                            }
                        }
                        if (typeof el.more === 'number') {
                            el.readmore = el.content.length > el.more ? true : false;
                            if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                el.readmore = false;
                                el.more = 0;
                            }
                            if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                el.readmore = false;
                                el.more = el.content.length;
                            }
                            el.subcontent = el.content.substr(0, el.more);
                        }
                        req.jiqiyu.ontop.push(el);
                    }
                    if (el.state === pstate.ontop + pstate.ppost &&
                        req.jiqiyu.user &&
                        req.jiqiyu.user._id === el.authorid.toString()) {
                        if (el.more === undefined && limit.less >= 0) {
                            if (el.content.length > limit.less) {
                                el.readmore = limit.less;
                                el.subcontent =
                                    el.original.substr(0, limit.less);
                            }
                        }
                        if (typeof el.more === 'number') {
                            el.readmore = el.content.length > el.more ? true : false;
                            if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                el.readmore = false;
                                el.more = 0;
                            }
                            if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                el.readmore = false;
                                el.more = el.content.length;
                            }
                            el.subcontent = el.content.substr(0, el.more);
                        }
                        req.jiqiyu.ontop.push(el);
                    }

                    if (++i === len) {
                        next();
                    }
                });
            } else {
                next();
            }
        });
    }
    
};

exports.getIndexPosts = function(req, res, next) {

    req.jiqiyu.posts = [];
    
    // check cache
    if (isCacheOn() && __indexCache.pageInfo !== undefined) {
        pageInfo = __indexCache.pageInfo;
        next();
    } else {
        
        var startId = null;
        var count = limit.postsPerPage;
        var page = 1;
        var currPg = null;
        var maxPg = null;
        
        Post.getPosts(
            startId, count, page, currPg, maxPg,
            function(err, docs) {
                if (err) {
                    return res.send(err);
                }
                var i = 0, len = docs.length;
                if (len) {
                    docs.forEach(function(el) {
                        el.date = el._id.getTimestamp().toDateString();
                        el.time = el._id.getTimestamp().toLocaleTimeString();
                        if (el.state === pstate.post) {
                            if (el.more === undefined && limit.less >= 0) {
                                if (el.content.length > limit.less) {
                                    el.readmore = limit.less;
                                    el.subcontent =
                                        el.original.substr(0, limit.less);
                                }
                            }
                            if (typeof el.more === 'number') {
                                el.readmore = el.content.length > el.more ? true : false;
                                if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = 0;
                                }
                                if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = el.content.length;
                                }
                                el.subcontent = el.content.substr(0, el.more);
                            }
                            req.jiqiyu.posts.push(el);
                        }
                        if ((el.state === pstate.ppost) &&
                            req.jiqiyu.user &&
                            (req.jiqiyu.user._id === el.authorid.toString())) {
                            if (el.more === undefined && limit.less >= 0) {
                                if (el.content.length > limit.less) {
                                    el.readmore = limit.less;
                                    el.subcontent =
                                        el.original.substr(0, limit.less);
                                }
                            }
                            if (typeof el.more === 'number') {
                                el.readmore = el.content.length > el.more ? true : false;
                                if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = 0;
                                }
                                if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = el.content.length;
                                }
                                el.subcontent = el.content.substr(0, el.more);
                            }
                            req.jiqiyu.posts.push(el);
                        }

                        if (++i === len) {
                            pageInfo.pageSince = el._id.toString();
                            if (len < count) {
                                pageInfo.maxPage = 1;
                                if (isCacheOn()) {
                                    __indexCache.pageInfo = pageInfo;
                                }
                                next();
                            } else {
                                Post.maxPage(
                                    ObjectId(req.jiqiyu.user._id),
                                    function(err, maxPage) {
                                        if (err) {
                                            console.log('/////max page error/////');
                                            next();
                                        } else {
                                            pageInfo.currPage = 1;
                                            pageInfo.maxPage = maxPage;
                                            if (isCacheOn()) {
                                                __indexCache.pageInfo = pageInfo;
                                            }
                                            next();
                                        }
                                    });
                            }
                        }
                    });
                } else {
                    pageInfo.currPage = 1;
                    pageInfo.maxPage = 1;
                    if (isCacheOn()) {
                        __indexCache.pageInfo = pageInfo;
                    }
                    next();
                }
            });
    }

};

exports.onTopGetNameById = function(req, res, next) {

    // check cache
    if (isCacheOn() && __indexCache.topPosts !== undefined) {
        req.jiqiyu.ontop = __indexCache.topPosts;
        next();
    } else {
        
        if (req.jiqiyu.ontop.length) {
            Post.getNameById(req.jiqiyu.ontop, function(err, arr) {
                req.jiqiyu.ontop = arr;
                if (isCacheOn()) {
                    __indexCache.topPosts = arr;
                }
                next();
            });
        } else {
            if (isCacheOn()) {
                __indexCache.topPosts = [];
            }
            next();
        }
    }

};

exports.getNameById = function(req, res, next) {
    
    // check cache
    var isIndex = (req.url.indexOf('/page') === -1 &&
                   req.url.indexOf('/control-panel/') === -1);
    if (isCacheOn() && __indexCache.posts !== undefined && isIndex) {
        req.jiqiyu.posts = __indexCache.posts;
        next();
    } else {
        
        if (req.jiqiyu.posts.length) {
            Post.getNameById(req.jiqiyu.posts, function(err, arr, dbtimes) {
                req.jiqiyu.posts = arr;
                if (isIndex && isCacheOn()) {
                    __indexCache.posts = arr;
                }
                next();
            });
        } else {
            if (isIndex && isCacheOn()) {
                __indexCache.posts = [];
            }
            next();
        }
    }

};

exports.tagcloud = function(req, res, next) {

    // check cache
    if (isCacheOn() && __indexCache.tag !== undefined) {
        req.jiqiyu.tag = __indexCache.tag;
        next();
    } else {
        
        Tag.all(function(err, docs) {
            if (err) {
                req.jiqiyu.tag = '標籤加載失敗了，可刷新頁面重試'
                if (isCacheOn()) {
                    __indexCache.tag = req.jiqiyu.tag;
                }
                next();
            } else if (docs.length === 0) {
                req.jiqiyu.tag = '暫無'
                if (isCacheOn()) {
                    __indexCache.tag = req.jiqiyu.tag;
                }
                next();
            } else {
                req.jiqiyu.tag = docs;
                if (isCacheOn()) {
                    __indexCache.tag = docs;
                }
                req.jiqiyu.tag.forEach(function(el, idx) {
                    if (el.postid && el.postid.length) {
                        el.npost = el.postid.length;
                        if (isCacheOn()) {
                            __indexCache.tag[idx].npost = el.npost;
                        }
                    }
                });
                next();
            }
        });
    }
    
};

exports.index = function(req, res) {

    req.jiqiyu.dbtimes = db.times;
    db.recount();
    req.jiqiyu.loadingTime = (new Date().getTime()) - req.jiqiyu.reqBegin;

    res.render('index', { title: '首頁 - MingRi.org',
                          name: req.cookies.name,
                          ul: ul,
                          level: +req.cookies.level,
                          cat: req.jiqiyu.cat,
                          tag: req.jiqiyu.tag,
                          ontop: req.jiqiyu.ontop,
                          posts: req.jiqiyu.posts,
                          page: isCacheOn() ? __indexCache.pageInfo : pageInfo,
                          dbtimes: req.jiqiyu.dbtimes,
                          loadingTime: req.jiqiyu.loadingTime,
                          postsMoreThan: postsMoreThan
                        });
    
};

exports.getPage = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    req.jiqiyu.posts = [];

    req.jiqiyu.user = req.session.user || {};

    pageInfo = {
        currPage: +req.query.curr,
        page: +req.params[0],
        pageSince: req.query.since,
        maxPage: +req.query.max
    };

    var page = pageInfo.page;
    if (page === 1) {
        return res.redirect('/');
    }
    
    var currUid = (req.session.user && req.session.user._id) ?
        ObjectId(req.session.user._id) : null;

    if (pageInfo && pageInfo.maxPage) {
        if (page > pageInfo.maxPage) {
            if (pageInfo.maxPage === 1) {
                return res.redirect('/');
            }
            var loc = '/post/page/' + pageInfo.maxPage +
                '/?curr=' + pageInfo.currPage +
                '&since=' + pageInfo.pageSince +
                '&max=' + pageInfo.maxPage;
            return res.redirect(loc);
        }
        
        var maxPage = pageInfo.maxPage;

        var startId = (pageInfo && /\w{24}/.test(pageInfo.pageSince)) ?
            ObjectId(pageInfo.pageSince.toString()) : null;

        var count = limit.postsPerPage;

        var currPage = (pageInfo && pageInfo.currPage) ?
            pageInfo.currPage : null;
        
        Post.getPosts(startId, count, page, currPage, maxPage, function(err, docs) {
            if (err) {
                console.log('///Post.getPosts#1 error///');
                return res.send(err);
            }
            var i = 0, len = docs.length;
            if (len) {
                pageInfo.currPage = page;
                pageInfo.pageSince = docs[len-1]._id.toString();
                docs.forEach(function(el) {
                    if (el.state === pstate.post) {
                        if (el.more === undefined && limit.less >= 0) {
                            if (el.content.length > limit.less) {
                                el.readmore = limit.less;
                                el.subcontent =
                                    el.original.substr(0, limit.less);
                            }
                        }
                        if (typeof el.more === 'number') {
                            el.readmore = el.content.length > el.more ? true : false;
                                if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = 0;
                                }
                                if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = el.content.length;
                                }
                            el.subcontent = el.content.substr(0, el.more);
                        }
                        el.date =
                            el._id.getTimestamp().toLocaleDateString();
                        el.time =
                            el._id.getTimestamp().toLocaleTimeString();
                        
                        req.jiqiyu.posts.push(el);
                    }
                    if ((el.state === pstate.ppost) &&
                         req.jiqiyu.user &&
                        (req.jiqiyu.user._id === el.authorid.toString())) {
                        if (el.more === undefined &&
                            limit.less >= 0 ) {
                            if (el.content.length > limit.less) {
                                el.readmore = limit.less;
                                el.subcontent =
                                    el.original.substr(0, limit.less);
                            }
                        }
                        if (typeof el.more === 'number') {
                            el.readmore = el.content.length > el.more ? true : false;
                            if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                el.readmore = false;
                                el.more = 0;
                            }
                            if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                el.readmore = false;
                                el.more = el.content.length;
                            }
                            el.subcontent = el.content.substr(0, el.more);
                        }
                        el.date =
                            el._id.getTimestamp().toLocaleDateString();
                        el.time =
                            el._id.getTimestamp().toLocaleTimeString();
                        
                        req.jiqiyu.posts.push(el);
                    }
                    if (++i === len) {
                        next();
                    }
                });
            } else {
                res.send('nothing and no posts');
            }
        });
    } else {
        Post.maxPage(currUid, function(err, maxPage) {
            if (err) {
                console.log('///max page error///');
                return res.send(err);
            }
            if (!maxPage) {
                maxPage = 1;
            }
            if (page > maxPage) {
                if (maxPage==1) {
                    return res.redirect('/');
                }
                var loc = '/post/page/' + maxPage +
                          '/?curr=' + pageInfo.currPage +
                          '&since=' + pageInfo.pageSince +
                          '&max=' + maxPage;
                return res.redirect(loc);
            }

            pageInfo.maxPage = maxPage;
            
            var startId = (pageInfo && pageInfo.pageSince) ?
                ObjectId(pageInfo.pageSince.toString()) : null;
            
            var count = limit.postsPerPage;
            
            var currPage = (pageInfo && pageInfo.currPage) ?
                pageInfo.currPage : null;
            
            Post.getPosts(startId, count, page, currPage, maxPage, function(err, docs) {
                if (err) {
                    console.log('///Post.getPosts#2 error///');
                    return res.send(err);
                }
                var i = 0, len = docs.length;
                if (len) {
                    pageInfo.currPage = page;
                    pageInfo.pageSince = docs[len-1]._id.toString();
                    docs.forEach(function(el) {
                        if (el.state === pstate.post) {
                            if (el.more === undefined && limit.less >= 0 ) {
                                if (el.content.length > limit.less) {
                                    el.readmore = limit.less;
                                    el.subcontent =
                                        el.original.substr(0, limit.less);
                                }
                            }
                            if (typeof el.more === 'number') {
                                el.readmore = el.content.length > el.more ? true : false;
                                if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = 0;
                                }
                                if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = el.content.length;
                                }
                                el.subcontent = el.content.substr(0, el.more);
                            }
                            el.date = el._id
                                        .getTimestamp()
                                          .toLocaleDateString();
                            el.time = el._id
                                        .getTimestamp()
                                          .toLocaleTimeString();
                            
                            req.jiqiyu.posts.push(el);
                        }
                        if ((el.state === pstate.ppost) &&
                             req.jiqiyu.user &&
                            (req.jiqiyu.user._id === el.authorid.toString())) {
                            if (el.more === undefined && limit.less >= 0 ) {
                                if (el.content.length > limit.less) {
                                    el.readmore = limit.less;
                                    el.subcontent =
                                        el.original.substr(0, limit.less);
                                }
                            }
                            if (typeof el.more === 'number') {
                                el.readmore = el.content.length > el.more ? true : false;
                                if (/^\s*\[\[!more\]\]/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = 0;
                                }
                                if (/\[\[!more\]\]\s*$/.test(el.original)) {
                                    el.readmore = false;
                                    el.more = el.content.length;
                                }
                                el.subcontent = el.content.substr(0, el.more);
                            }
                            el.date = el._id
                                        .getTimestamp()
                                          .toLocaleDateString();
                            el.time = el._id
                                        .getTimestamp()
                                          .toLocaleTimeString();
                            
                            req.jiqiyu.posts.push(el);
                        }
                        if (++i === len) {
                            next();
                        }
                    });
                } else {
                    res.send('nothing and no posts');
                }
            });
        });
    }
    
};

exports.page = function(req, res) {

    req.jiqiyu.dbtimes = db.times;
    db.recount();

    res.render('page', { title: '第' + pageInfo.currPage + '頁 - MingRi.org',
                         name: req.cookies.name,
                         ul: ul,
                         level: +req.cookies.level,
                         cat: req.jiqiyu.cat,
                         tag: req.jiqiyu.tag,
                         posts: req.jiqiyu.posts,
                         page: pageInfo,
                         dbtimes: req.jiqiyu.dbtimes,
                         postsMoreThan: postsMoreThan
                       });
    
};

exports.thePost = function(req, res) {

    var id = ObjectId(req.params[0].toString());
    var user = req.session.user;
    
    Post.getPostById(id, function(err, doc) {
        if (err) {
            return res.send(err);
        }
        if (doc) {
            if ((doc.state === pstate.ppost) ||
                (doc.state === pstate.ppost + pstate.ontop)) {
                if (user._id !== doc.authorid.toString()) {
                    return res.send('這是私有文章，僅作者可見');
                }
                if (doc.state === pstate.ppost + pstate.ontop) {
                    doc.title = '[私人的][置頂]' + doc.title;
                } else {
                    doc.title = '[私人的]' + doc.title;
                }
            }
            if (doc.state === pstate.ontop) {
                doc.title = '[置頂]' + doc.title;
            }
            doc.date = id.getTimestamp().toDateString();
            doc.time = id.getTimestamp().toLocaleTimeString();
            Post.getNameById([doc], function(err, docs) {
                if (err) {
                    return res.send(err);
                }
                var dbtimes = db.times;
                db.recount();
                res.render('thePost', {
                    title: docs[0].title + '- MingRi.org',
                    name: req.cookies.name,
                    ul: ul,
                    level: +req.cookies.level,
                    pstate: pstate,
                    post: docs[0],
                    dbtimes: dbtimes
                });
            });
        } else {
            return res.send('抱歉，找不到你要的這篇文章');
        }
    });
    
};

exports.getPostsInCategory = function(req, res) {

    var subcat = req.query.subcat;
    subcat = subcat ? subcat.split(',') : [];
    var catId = [req.query.id].concat(subcat);
    var i, catIdLen = catId.length;
    for (i=0; i<catIdLen; i++) {
        catId[i] = ObjectId(catId[i]);
    }
    var user = req.session.user;
    Category.getPostsInCategory(catId, function(err, docs) {
        if (err) {
            return res.send(err);
        }
        if (!docs || !docs.length) {
            return res.send('該分類下尚無文章');
        }
        var posts = [];
        docs.forEach(function(el) {
            if (el.state === pstate.ppost ||
                el.state === pstate.ppost + pstate.ontop) {
                if (user && user._id === el.authorid.toString()) {
                    if (el.state === pstate.ppost) {
                        el.title = '私人的：' + el.title;
                    } else {
                        el.title = '置頂+私人的：' + el.title;
                    }
                    posts.push(el);
                }
            } else {
                if (el.state === pstate.ontop) {
                    el.title = '置頂：' + el.title;
                }
                posts.push(el);
            }
        });
        var title = '';
        if (catId.length > 1) {
            title = '存檔：發佈在『' + req.params[0] + '』及其下屬分類下的文章 - MingRi.org';
        } else {
            title = '存檔：發佈在『' + req.params[0] + '』分類下的文章 - MingRi.org';
        }
        var dbtimes = db.times;
        db.recount();
        res.render('archive', { title: title,
                                name: req.cookies.name,
                                ul: ul,
                                level: +req.cookies.level,
                                type: 'theCat',
                                theCat: catId,
                                posts: posts,
                                dbtimes: dbtimes
                              });
    });

};

exports.getTaggedPosts = function(req, res) {
    
    var tagName = req.params[0];
    Post.getTaggedPosts(tagName, function(err, docs) {
        if (err) {
            return res.send(err);
        }
        if (!docs || !docs.length) {
            return res.send('尚未有標記了此標籤的文章');
        }
        var posts = [];
        docs.forEach(function(el) {
            if ((el.state === pstate.ppost) ||
                (el.state === pstate.ppost + pstate.ontop)) {
                if (req.session.user &&
                    (req.session.user._id === el.authorid.toString())) {
                    el.title = '私人的：' + el.title;
                    if (el.state === pstate.ppost + pstate.ontop) {
                        el.title = '置頂+私人的：' + el.title;
                    }
                    posts.push(el);
                }
            } else {
                if (el.state === pstate.ontop) {
                    el.title = '置頂：' + el.title;
                }
                posts.push(el);
            }
        });
        var dbtimes = db.times;
        db.recount();
        req.jiqiyu.loadingTime = (new Date().getTime()) - req.jiqiyu.reqBegin;
        res.render('archive', { title: '存檔：標記爲『' + tagName + '』的文章 - MingRi.org',
                                name: req.cookies.name,
                                ul: ul,
                                level: +req.cookies.level,
                                type: 'theTag',
                                theTag: tagName,
                                posts: posts,
                                dbtimes: dbtimes,
                                loadingTime: req.jiqiyu.loadingTime
                              });
    });

};