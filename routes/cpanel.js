/*
 * Control panel
 */

// var url = require('url');
var ObjectId = require('mongodb').ObjectID;
var ul = require('../conf').userLevel;
var limit = require('../conf').limit;
var postsMoreThan = require('../conf').tagcloud.postsMoreThan;
var pstate = require('../conf').postState;
var User = require('../models/user');
var Post = require('../models/post');
var Category = require('../models/category');
var Tag = require('../models/tag');
var recountDb = require('../models/db').recount;

var pageInfo = null;

exports.contentStat = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    Post.count(function(err, doc) {
        if (err) {
            return res.send(err);
        }
        req.jiqiyu.postStat = {};
        if (doc) {
            req.jiqiyu.postStat.top = doc.property.topCounter || 0;
            req.jiqiyu.postStat.post = doc.property.postCounter || 0;
            req.jiqiyu.postStat.ppost = doc.property.ppostCounter || 0;
            req.jiqiyu.postStat.draft = doc.property.draftCounter || 0;
            req.jiqiyu.postStat.total = req.jiqiyu.postStat.draft +
                req.jiqiyu.postStat.top +
                req.jiqiyu.postStat.post +
                req.jiqiyu.postStat.ppost;
        } else {
            req.jiqiyu.postStat.top = 0;
            req.jiqiyu.postStat.post = 0;
            req.jiqiyu.postStat.ppost = 0;
            req.jiqiyu.postStat.draft = 0;
            req.jiqiyu.postStat.total = 0;
        }
        Category.count(function(err, doc) {
            if (err) {
                return res.send(err);
            }
            req.jiqiyu.ncat = doc;
            next();
        });
    });

};

exports.userStat = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    req.jiqiyu.userStat = {};
    
    User.count(function(err, nSu, nEd, nAu, nReg) {
        if (err) {
            if (err = 'no user') {
                req.jiqiyu.userStat.total = 0;
                next();
            } else {
                return res.send(err);
            }
        }
        req.jiqiyu.userStat.nSu = nSu;
        req.jiqiyu.userStat.nEd = nEd;
        req.jiqiyu.userStat.nAu = nAu;
        req.jiqiyu.userStat.nReg = nReg;
        next();
    });
    
};

exports.recentComments = function(req, res, next) {

    next();
    
};

exports.loginForm = function(req, res) {
    
    if (req.session.user && req.session.user._id) {
        console.log(JSON.stringify(req.session) + "---" +
                    JSON.stringify(req.session.user) + "---" +
                    req.session.user._id);
        return res.send('已經登錄為 ' +
                        req.cookies.name +
                        '，<a href="/">點這裡回首頁</a>');
    }
    res.render('login', { title: '用戶登錄 - MingRi.org',
                          referrer: req.query.ref, // url.parse(req.url, true).query.ref,
			              success : req.flash('success').toString(),
			              error : req.flash('error').toString(),
                          documents: '控制台各頁面的右下角有相關的提示文檔'
                        });

};

exports.login = function(req, res) {
    
    var ref = req.query.ref; // url.parse(req.url,true).query.ref;
    ref = ( ref === undefined) ? "" : ("?ref=" + ref);
    User.get(req.body.username, function(err, user) {
        if (!user) {
            req.flash('error', '用戶名或密碼不對，需重填');
            return res.redirect('/login' + ref);
        }
        var password = require('crypto')
                         .createHash('md5')
                           .update(req.body.pwd)
                             .digest('hex');
        if (user.password !== password) {
            req.flash('error', '用戶名或密碼不對，需重填');
            return res.redirect('/login' + ref);
        }
        if (!req.body.rememberme) {
            res.cookie('name', user.name, {expires: 0});
            res.cookie('level', user.level, {expires: 0});
            req.session.cookie.expires = false;
        } else {
            res.cookie('name', user.name, {maxAge: 3600000 * 24 * 30});
            res.cookie('level', user.level, {maxAge: 3600000 * 24 * 30});
        }
        req.session.user = {'_id': user._id, 'level': user.level};
        if (ref === '?ref=cpanel') {
            return res.redirect('/control-panel');
        }
        if (ref === "") {
            return res.redirect('/');
        }
    });

};

exports.logout = function(req, res) {
    
    req.session.destroy();
    res.clearCookie('name');
    res.clearCookie('level');
    return res.redirect('/');

};

exports.getIndexPosts = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    req.jiqiyu.ontop = [];
    req.jiqiyu.posts = [];
    if (!pageInfo) {
        pageInfo = {};
    }
    var user = req.session.user;
    if (!user) {
        return res.redirect('/login?ref=cpanel');
    }
    user._id = ObjectId(user._id);
    var startId = null;
    var count = limit.cpPostsPerPage;
    var page = 1;
    var currPg = null;
    var maxPg = null;

    Post.cpGetPosts(
        user, startId, count, page, currPg, maxPg,
        function(err, docs) {
            var i = 0, len = docs.length;
            if (len) {
                docs.forEach(function(el) {
                    el.date =
                        el._id.getTimestamp().toDateString();
                    el.time =
                        el._id.getTimestamp().toLocaleTimeString();
                    if (el.state === pstate.ontop ||
                        el.state === pstate.ontop + pstate.ppost) {
                        req.jiqiyu.ontop.push(el);
                    } else {
                        req.jiqiyu.posts.push(el);
                    }
                    if (++i === len) {
                        pageInfo.pageSince = el._id.toString();
                        if (len < count) {
                            pageInfo.maxPage = 1;
                            pageInfo.currPage = 1;
                            next();
                        } else {
                            Post.cpMaxPage(user, function(err, n) {
                                if (err) {
                                    return res.send('cpMaxPage error');
                                } else {
                                    pageInfo.currPage = 1;
                                    pageInfo.maxPage = n;
                                    next();
                                }
                            });
                        }
                    }
                });
            } else {
                pageInfo.currPage = 1;
                pageInfo.maxPage = 1;
                next();
            }
        });
    
};

exports.index = function(req, res) {

    var user = req.session.user;
    if (!user) {
        return res.redirect('/login?ref=cpanel');
    } else {
        recountDb();
        res.render('cpanel', { title: '控制台 - MingRi.org',
                               name: req.cookies.name,
                               level: +req.cookies.level,
                               ul: ul,
                               postStat: req.jiqiyu.postStat,
                               ncat: req.jiqiyu.ncat,
                               tag: req.jiqiyu.tag,
                               userStat: req.jiqiyu.userStat,
                               postsMoreThan: postsMoreThan,
                               documents: ''
                             });
    }
    
};

exports.cpGetPage = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    req.jiqiyu.posts = [];

    var user = req.session.user;
    if (!user || user.level < ul.author) {
        return res.send('no privilege');
    } else {
        user._id = ObjectId(user._id);
    }

    pageInfo = {
        currPage: +req.query.curr,
        page: +req.params[0],
        pageSince: req.query.since,
        maxPage: +req.query.max
    };

    var page = pageInfo.page;
    if (page === 1) {
        return res.redirect('/control-panel/post');
    }

    if (pageInfo && pageInfo.maxPage) {
        if (page > pageInfo.maxPage) {
            if (pageInfo.maxPage === 1) {
                return res.redirect('/control-panel/post');
            }
            var loc = '/control-panel/post/page/' + pageInfo.maxPage +
                '/?curr=' + pageInfo.currPage +
                '&since=' + pageInfo.pageSince +
                '&max=' + pageInfo.maxPage;
            return res.redirect(loc);
        }
        var maxPage = pageInfo.maxPage;
        var startId = (pageInfo && /\w{24}/.test(pageInfo.pageSince)) ?
            ObjectId(pageInfo.pageSince.toString()) : null;
        var count = limit.cpPostsPerPage;
        var currPage = (pageInfo && pageInfo.currPage) ?
            pageInfo.currPage : null;
        Post.cpGetPosts(user, startId, count, page, currPage, maxPage, function(err, docs) {
            if (err) {
                console.log('///Post.cpGetPosts#1 error///');
                return res.send(err);
            }
            var i = 0, len = docs.length;
            if (len) {
                pageInfo.currPage = page;
                pageInfo.pageSince = docs[len-1]._id.toString();
                docs.forEach(function(el) {
                    el.date =
                        el._id.getTimestamp().toDateString();
                    el.time =
                        el._id.getTimestamp().toLocaleTimeString();
                    req.jiqiyu.posts.push(el);
                    if (++i === len) {
                        next();
                    }
                });
            } else {
                res.send('nothing and no posts');
            }
        });
    } else {
        Post.cpMaxPage(user, function(err, maxPage) {
            if (err) {
                return res.send('cpMaxPage error');
            }
            if (!maxPage) {
                maxPage = 1;
            }
            if (page > maxPage) {
                if (maxPage === 1) {
                    return res.redirect('/control-panel/post');
                }
                var loc =
                    '/control-panel/post/page/' + pageInfo.maxPage +
                    '/?curr=' + pageInfo.currPage +
                    '&since=' + pageInfo.pageSince +
                    '&max=' + pageInfo.maxPage;
                return res.redirect(loc);
            }

            var startId =
                (pageInfo && /\w{24}/.test(pageInfo.pageSince)) ?
                ObjectId(pageInfo.pageSince.toString()) : null;
            var count = limit.cpPostsPerPage;
            var currPage = (pageInfo && pageInfo.currPage) ?
                pageInfo.currPage : null;
            Post.cpGetPosts(user, startId, count, page, currPage, maxPage, function(err, docs) {
                if (err) {
                    console.log('///Post.cpGetPosts#2 error///');
                    return res.send(err);
                }
                var i = 0, len = docs.length;
                if (len) {
                    pageInfo.currPage = page;
                    pageInfo.pageSince = docs[len-1]._id.toString();
                    docs.forEach(function(el) {
                        el.date =
                            el._id.getTimestamp().toDateString();
                        el.time =
                            el._id.getTimestamp().toLocaleTimeString();
                        req.jiqiyu.posts.push(el);
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

    recountDb();
    res.render('managePost', { title: '第' + pageInfo.currPage + '頁 - MingRi.org',
                               name: req.cookies.name,
                               ul: ul,
                               uid: req.session.user._id,
                               level: +req.cookies.level,
                               ontop: [],
                               posts: req.jiqiyu.posts,
                               page: pageInfo,
                               documents: ''
                             });
    
};

exports.managePost = function(req, res) {

    recountDb();
    res.render('managePost', { title: '管理文章',
                               name: req.cookies.name,
                               ul: ul,
                               uid: req.session.user._id,
                               level: +req.cookies.level,
                               ontop: req.jiqiyu.ontop,
                               posts: req.jiqiyu.posts,
                               page: pageInfo,
                               documents: ''
                             });
    
};

exports.manageUser = function(req, res) {

    if (!req.session.user) {
        return res.redirect('/login?ref=cpanel');
    }
        
    recountDb();
    User.all(function(err, users) {
        if (err) {
            return res.send(err);
        }
        res.render('manageUser', { title: '管理用戶',
                                   name: req.cookies.name,
                                   ul: ul,
                                   level: +req.cookies.level,
                                   users: users,
                                   role: {'0': '普通用戶', '1': '作者', '2': '編輯', '3': '超級用戶'},
                                   success : req.flash('success').toString(),
			                       error : req.flash('error').toString(),
                                   deletionErr: req.flash('deletionErr').toString(),
                                   deleted: req.flash('deleted').toString(),
                                   documents: '網站的用戶有四種權限級別：1. 普通用戶，可瀏覽文章及發表評論；2. 作者，除擁有普通用戶權限外，還可發佈文章和管理普通用戶的評論；3. 編輯，除擁有作者之權限外，還可發佈及管理文章分類和標籤、管理作者發佈的文章和評論； 4. 超級用戶，除擁有編輯之權限外，還可管理用戶（增刪用戶、編輯用戶資料、權限等）及其發佈的內容；一個站點只有一位超級用戶。另，所有用戶可管理自己發佈的內容。'
                                 }); 
    });
    
};