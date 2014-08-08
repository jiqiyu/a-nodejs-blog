var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
var path = require('path');

var ul = require('../conf').userLevel;
var limit = require('../conf').limit;
var pstate = require('../conf').postState;
var User = require('../models/user');
var Post = require('../models/post');
var Tag = require('../models/tag');
var Category = require('../models/category');
var Fn = require('../models/func');
var recountDb = require('../models/db').recount;

var Robotskirt = require('robotskirt');
// var parser = Robotskirt.Markdown.std();
var renderer = new Robotskirt.HtmlRenderer(); // [Robotskirt.HTML_ESCAPE]
// renderer.blockcode = function(code, language) {
//     if (language === 'nohighlight' ||
//         language === 'unknown' || !language) {
//         return '\n<pre><code>' + Robotskirt.houdini.escapeHTML(code) +
//                '</code></pre>\n';
//     } else if (language) {
//         return '\n<pre><code class="language-' + language + '">' +
//                Robotskirt.houdini.escapeHTML(code) + '</code></pre>\n';
//     } else {
//         return '\n<pre><code>' + Robotskirt.houdini.escapeHTML(code) +
//                '</code></pre>\n';
//     }
// }
var parser = new Robotskirt.Markdown(renderer, [Robotskirt.EXT_TABLES,
                                                // Robotskirt.EXT_FENCED_CODE,
                                                Robotskirt.EXT_STRIKETHROUGH]);

exports.adduser = function(req, res) {
    
    if (!Fn.auth(req.session.user, 'editor', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    var name = Fn.getReqStr(req.body.username);
    var pass1 = Fn.getReqStr(req.body.pass1);
    var pass2 = Fn.getReqStr(req.body.pass2);
    var email = Fn.getReqStr(req.body.email);
    var intro = Fn.getReqStr(req.body.intro);
    
    if (!name || !pass1 || !pass2) {
        req.flash('error', '用戶名或密碼不可以留空');
        return res.redirect('/control-panel/user');
    }
    if (name.length > 20) {
        req.flash('error', '用戶名過長');
        return res.redirect('/control-panel/user');
    }
    if (pass1 !== pass2) {
        req.flash('error', '密碼兩次輸入得不一樣');
        return res.redirect('/control-panel/user');
    }
    if (pass1.length < 6) {
        req.flash('error', '密碼太過短，至少要六位');
        return res.redirect('/control-panel/user');
    }
    var reEmail = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-z]{2,6}$/);
    if (email && email.search(reEmail) === -1) {
        req.flash('error', '郵箱格式不對');
        return res.redirect('/control-panel/user');
    }
    if (email.length > 64) {
        req.flash('error', '郵箱過長');
        return res.redirect('/control-panel/user');
    }
    if (intro && intro.length > 200) {
        req.flash('error', '用戶簡介過長');
        return res.redirect('/control-panel/user');
    }

    var role = req.body.role;
    if (!Fn.isRole(role)) {
        req.flash('error', 'invalid role');
        return res.redirect('/control-panel/user');
    }

    var user = {"name": name,
                "password": require('crypto')
                              .createHash('md5')
                                .update(pass1)
                                  .digest('hex'),
                "level": +role,
                "email": email,
                "intro": intro || ''
               };
    User.add(user, function(err, user) {
        if (err) {
            req.flash('error', '新增用戶失敗了：這個用戶名或者郵箱已經有人在用了');
            return res.redirect('/control-panel/user');
        }
        var role = {0:'普通用戶', 1:'作者', 2:'編輯'};
        req.flash('success', '新增了' + role[user[0].level] + '「' + user[0].name + '」');
        return res.redirect('/control-panel/user');
    });

};

exports.delUser = function(req, res) {

    var user = req.session.user;
    if (!Fn.auth(user, 'su', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    
    var userid = ObjectId(req.params[0]);
    User.del(userid, function(err) {
        if (err) {
            req.flash('deletionErr', '刪除失敗！');
            return res.redirect('/control-panel/user');
        }
        req.flash('deleted', '刪除成功');
        return res.redirect('/control-panel/user');
    });
    
};

exports.editUser = function(req, res) {

    var user = req.session.user;
    if (!Fn.auth(user, 'su', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    
    var username = Fn.trim(req.params[0]);
    var data = req.body.obj;
    data.intro = Fn.getReqStr(data.intro);
    
    if (!Fn.isRole(data.level)) {
        return res.send('error #145,36');
    }
    if (!data.level && !data.intro) {
        return res.send('err: nothing changed');
    }
    if (data.intro.length > 200) {
        return res.send('err: intro too long');
    }
    
    User.edit(username, data, function(err) {
        if (err) {
            console.log(err);
            return res.send('err');
        }
        return res.send('ok');
    });
    
};

exports.loadCategoryTree = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    
    var user = req.jiqiyu.user = req.session.user;
    if (req.url.indexOf('/control-panel') !== -1) {
        if (!Fn.auth(user, 'author', ul)) {
            return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
        }
    }

    Category.tree(function(err, count, depth, rootleaf, parent, child, leaf) {
        if (err) {
            req.jiqiyu.cat = '分類加載失敗了，刷新試下';
            next();
        }
        if (count === 0) {
            req.jiqiyu.cat = '暫無';
            next();
        } else if (depth === 0) {
                req.jiqiyu.cat = {};
                req.jiqiyu.cat.unfold = rootleaf;
                next();
        } else if (depth > 0) {
            req.jiqiyu.cat = {};
            Category.countPosts(parent, child, depth);
            req.jiqiyu.cat.unfold = Category.walk(parent, child, leaf, 0, depth, []);
            req.jiqiyu.cat.unfold = req.jiqiyu.cat.unfold.concat(rootleaf);
            next();
        }
    });
    
};

exports.loadAuthor = function(req, res, next) {

    var user = req.jiqiyu.user;
    
    var authorList = [];
    var currUser = {};
    currUser._id = user._id;
    currUser.name = req.cookies.name;
    currUser.level = user.level;
    authorList.push(currUser);
    
    if (user.level === ul.author) {
        req.jiqiyu.authorList = authorList;
        next();
    }
    
    if (user.level > ul.author) {
        Post.getAuthorList(user.level, function(err, author) {
            if (err) {
                authorList = null;
            }
            var len = author.length;
            if (len) {
                for (var i=0; i<len; i++) {
                    var temp = {};
                    temp._id = author[i]._id;
                    temp.name = author[i].name;
                    temp.level = author[i].level;
                    authorList.push(temp);
                }
            }
            req.jiqiyu.authorList = authorList;
            next();
        });
    }

};

exports.postNewForm = function(req, res) {

    recountDb();
    res.render('postnew', {title: '發布文章 - MingRi.org',
                           cat: req.jiqiyu.cat,
                           name: req.cookies.name,
                           level: req.jiqiyu.user.level,
                           ul: ul,
                           authorList: req.jiqiyu.authorList,
                           documents: 'see more information about markdown syntax, go to: http://daringfireball.net/projects/markdown/syntax'
                          });

};

exports.getTagId = function(req, res, next) {
    
    req.jiqiyu = req.jiqiyu || {};
    var user = req.jiqiyu.user = req.session.user;
    if (!Fn.auth(user, 'author', ul)) {
        return res.send('權限不足，<a href="/">點這裏去首頁</a>');
    }
    
    req.jiqiyu.tagId = [];
    req.jiqiyu.tagNew = [];

    if (req.body.tag !== undefined) {
        var tag = Fn.getReqStr(req.body.tag);
        if (!tag || /^[\s,]*$/.test(tag)) {
            req.jiqiyu.tagArray = ['沒有標籤'];
        } else {
            var re0 = /(^[\s,]|[\s,]$)/g;
            var re1 = /\s+,+|,{2,}/g;
            while(re0.test(tag) || re1.test(tag)) {
                tag = tag.replace(re0, '').replace(re1, ',');
            }
            req.jiqiyu.tagArray = tag.split(',');
            var tagArrLen = req.jiqiyu.tagArray.length;
            for (var i=0; i<tagArrLen; i++) {
                if (req.jiqiyu.tagArray[i].length > 20) {
                    return res.send('一個或多個標籤過長');
                }
            }
        }

        if (!tagArrLen) {
            req.jiqiyu.tagArray = ['沒有標籤'];
        }
        
        Post.getTagId(req.jiqiyu.tagArray, function(err, doc) {
            if (err) { return res.send('!error! action.js #172'); }
            if (doc) {
                var temp = [];
                doc.forEach(function(el) {
                    req.jiqiyu.tagId.push(el._id);
                    temp.push(el.name);
                });
                if (doc.length < tagArrLen) {
                    req.jiqiyu.tagArray.forEach(function(el) {
                        function unEqual(element, index, array) {
                            return (element !== el);
                        }
                        if (temp.every(unEqual)) {
                            req.jiqiyu.tagNew.push({"name": el});
                        }
                    });
                }
            } else {
                req.jiqiyu.tagArray.forEach(function(el, idx) {
                    req.jiqiyu.tagNew.push({"name": el});
                });
            }

            if (req.jiqiyu.tagNew.length) {
                Tag.add(req.jiqiyu.tagNew, function(err, doc) {
                    if (err) {
                        return res.send('!error! action.js #198');
                    }
                    doc.forEach(function(el) {
                        req.jiqiyu.tagId.push(el._id);
                    });
                    next();
                });
            } else { next(); }
        });
    } else { next(); }

};

exports.getCatId = function(req, res, next) {
    
    req.jiqiyu.catId = [];
    req.jiqiyu.catNew = [];

    if (req.body.category === undefined && !req.body.parentid) {
        req.jiqiyu.catNew.push({'name': '未分類',
                                'isdefault': true,
                                'depth': 0,
                                'haschildren': false
                               });
    }
    if (req.body.category = Fn.getReqStr(req.body.category)) {
        if (!Fn.isObjectIdString(req.body.category)) {
            return res.send('error #346,40');
        }
        req.jiqiyu.catId.push(ObjectId(req.body.category));
    } else if (
        (req.body.newcatname = Fn.getReqStr(req.body.newcatname)) &&
            (req.body.parentid = Fn.getReqStr(req.body.parentid))) {
        if (req.jiqiyu.user.level < ul.editor) {
            return res.send('錯誤：編輯或以上權限的用戶才可以新建分類，<a onclick="javascript:history.back();" style="cursor: pointer; border-bottom: 1px solid blue; color: blue">返回</a>');
        }
        var tmp = req.body.parentid.split(',');
        var parentidArr = [];
        if (tmp.length === 1) {
            req.jiqiyu.catNew.push({
                'name': req.body.newcatname,
                'depth': 0,
                'haschildren': false
            });
        } else {
            if (!Fn.isObjectIdString(tmp[0]) || isNaN(+tmp[1])) {
                return res.send('error #366,44');
            }
            req.jiqiyu.catNew.push({
                'name': req.body.newcatname,
                'depth': +tmp[1] + 1,
                'parent': ObjectId(tmp[0]),
                'haschildren': false,
            });
            parentidArr.push(ObjectId(tmp[0]));
        }
    } else {
        return res.send('error #377,36'); /*<a onclick="javascript:history.back();" style="cursor: pointer; border-bottom: 1px solid blue; color: blue">返回</a>'*/
    }

    if (req.jiqiyu.catNew.length) {
        Category.catNew(req.jiqiyu.catNew, parentidArr,
                        function(err, doc) {
                            if (err === '分類名重複了') {
                                return res.send('錯誤：分類名重複了，<a onclick="javascript:history.back();" style="cursor: pointer; border-bottom: 1px solid blue; color: blue">返回重填</a>');
                            }
                            if (err) {
                                return res.send('!error! action.js #269');
                            }
                            doc.forEach(function(el) {
                                req.jiqiyu.catId.push(el._id);
                            });
                            next();
                        });
    } else { next(); }
    
};

exports.postNew = function(req, res, next) {

    req.jiqiyu.postNew = true; // used in upsProperty function
    var user = req.jiqiyu.user;
    var post = {};
    post.title = Fn.getReqStr(req.body.title);
    post.original = Fn.getReqStr(req.body.content);
    if (!post.title || !post.original) {
        return res.send('error #406,36');
    }
    var tempstring = post.original
                       .replace(/<([^> ]+)/gi,"&lt;$1")
                         .replace(/<\/([^> ]+)/gi, "&lt;$1");

    var i = 0, props, matches = [];
    var css = '';
    var reCode = /\n*```([a-zA-z]*)\s*/;
    var reImg = /&lt;img[^>]+>/gi;
    var reProps = /&lt;img[^>]+?((?:src|style|title|alt)=(?:"[^"]*"|'[^']*'))[^>]*>/i;
    var imgArr = tempstring.match(reImg);
    var ilen = imgArr ? imgArr.length : 0;

    while ((matches = tempstring.match(reCode)) !== null) {
        ++i;
        if (matches[1] === 'unknown' || matches[1] === 'nohighlight') {
            css = 'class="no-highlight"';
        } else if (matches[1]) {
            css = 'class="language-' + matches[1] + '"';
        }
        if (i % 2) {
            tempstring = tempstring.replace(matches[0], '\n\n<pre><code ' + css + '>');
        } else {
            tempstring = tempstring.replace(matches[0], '</code></pre>\n');
        }
    }
    
    if (ilen) {
        var imgArrCopy = tempstring.match(reImg);
        var safeImgArr = [];
        for (props='', i=0; i<ilen; props='', i++) {
            while ((matches = imgArrCopy[i].match(reProps)) !== null) {
                imgArrCopy[i] = matches[0].replace(matches[1], '');
                props += ' ' + matches[1];
            }
            safeImgArr[i] = '<img' + props + '>';
        }
        for (i=0; i<ilen; i++) {
            tempstring = tempstring.replace(imgArr[i], safeImgArr[i]);
        }
    }

    tempstring = parser.render(tempstring); 

    var pos = tempstring.indexOf('[[!more]]');
    if (pos !== -1) {
        post.more = pos;
        post.content = tempstring.replace(/\[\[\!more\]\]/gi, '\n');
    } else {
        post.content = tempstring;
    }
    
    post.catid = req.jiqiyu.catId;
    post.tagid = req.jiqiyu.tagId;
    post.state = req.jiqiyu.state =
        (req.body.submitpost === "發佈" &&
         !Fn.parseBool(req.body.appointed_time)) ?
        pstate.post : pstate.draft;
    post.commentid = [];

    if (req.body.author = Fn.getReqStr(req.body.author)) {
        var au = req.body.author.split(',');
        if (!Fn.isObjectIdString(au[0])) {
            return res.send('error #468,40');
        }
        req.jiqiyu.authorname = au[2];
        post.authorid = ObjectId(au[0]);
        // if (+au[1] > ul.author) {
            post.level = +au[1];
        // }
    } else {
        post.authorid = ObjectId(user._id);
        req.jiqiyu.authorname = req.cookies.name;
        // if (user.level > ul.author) {
            post.level = user.level;
        // }
    }

    if (!Fn.parseBool(req.body.appointed_time) && post.state) {
        var d = new Date();
        post.year = d.getFullYear();
        post.month = d.getMonth() + 1;
    }

    if (Fn.parseBool(req.body.commentoff)) {
        post.commentoff = true;
    }
    if (Fn.parseBool(req.body.isprivate)) {
        if (post.state) {
            if (Fn.parseBool(req.body.ontop)) {
                post.state = req.jiqiyu.state =
                    pstate.ppost + pstate.ontop;
            } else {
                post.state = req.jiqiyu.state = pstate.ppost;
            }
        } else { // if post.state === pstate.draft
            post.isprivate = true;
        }
    }
    if (Fn.parseBool(req.body.appointed_time)) {
        var apt;
        if (apt = Fn.reqAppointTime(req.body.year,
                                    req.body.month,
                                    req.body.day,
                                    req.body.hour,
                                    req.body.minute,
                                    req.body.second)) {
            post.appointed_time = apt;
            post.year = +req.body.year;
            post.month = +req.body.month;
        } else {
            return res.send('appointed_time error!');
        }
    }

    if (Fn.parseBool(req.body.ontop)) {
        if (post.state) {
            if (Fn.parseBool(req.body.isprivate)) {
                post.state = req.jiqiyu.state =
                    pstate.ppost + pstate.ontop;
            } else {
                post.state = req.jiqiyu.state = pstate.ontop;
            }
        } else { // if post.state===pstate.draft
            post.ontop = true;
        }
    }
    
    Post.postNew(post, function(err, doc) {
        if (err) {
            return res.send('!error! action.js #377');
        }
        
        req.jiqiyu.postId = doc[0]._id;
        
        Post.userAddPid(
            post.authorid,
            req.jiqiyu.postId,
            req.jiqiyu.state,
            function(err) {
                if (err) {
                    return res.send(err);
                }
                next();
            });
    });
    
};

exports.upsProperty = function(req, res, next) {
    
    var postProp = {
        postCounter: 0,
        ppostCounter: 0,
        topCounter: 0,
        draftCounter: 0
    };

    if (req.jiqiyu.state !== undefined) {
        if (req.jiqiyu.postNew) {
            if ((req.jiqiyu.state === pstate.ontop) ||
                (req.jiqiyu.state === pstate.ppost + pstate.ontop)) {
                ++postProp.topCounter;
            }
            if (req.jiqiyu.state === pstate.post) {
                ++postProp.postCounter;
            }
            if (req.jiqiyu.state === pstate.draft) {
                ++postProp.draftCounter;
            }
            if (req.jiqiyu.state === pstate.ppost) {
                // || req.jiqiyu.state === pstate.ppost + pstate.ontop) {
                ++postProp.ppostCounter;
            }
        }

        // edit post
        if (req.jiqiyu.incPostCounter) {
            ++postProp.postCounter;
        }
        if (req.jiqiyu.incPpostCounter) {
            ++postProp.ppostCounter;
        }
        if (req.jiqiyu.incTopCounter) {
            ++postProp.topCounter;
        }
        
        if (req.jiqiyu.decDraftCounter) {
            --postProp.draftCounter;
        }
        if (req.jiqiyu.decPostCounter) {
            --postProp.postCounter;
        }
        if (req.jiqiyu.decPpostCounter) {
            --postProp.ppostCounter;
        }
        if (req.jiqiyu.decTopCounter) {
            --postProp.topCounter;
        }

        Post.upsProperty(postProp, function(err, doc) {
            if (err === 'ontop error') {
                return res.send('出錯了：置頂文章數量不能多過' + limit.ontop + '篇');
            } else if (err) {
                return res.send(err);
            }
            next();
        });
    } else { next(); }
    
};

exports.postRelatedFields = function(req, res, next) {

    Post.tagAddPid(
        req.jiqiyu.tagId,
        req.jiqiyu.postId,
        req.jiqiyu.state,
        function(err) {
            if (err) {
                return res.send('!error! action.js #454');
            }
            Post.catAddPid(
                req.jiqiyu.catId,
                req.jiqiyu.postId,
                req.jiqiyu.state,
                function(err) {
                    if (err) {
                        return res.send('!error! action.js #462');
                    }
                    next();
                });
        });
    
};

exports.post = function(req, res) {

    var loc = '/control-panel/post/edit/' +
              req.jiqiyu.postId +
              '?au=' +
              req.jiqiyu.authorname +
              '&tag=' +
              req.jiqiyu.tagArray.join(',') +
              '&ref=newpost';
    res.redirect(loc);
    
};

exports.delPostsById = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    var pidArr = [ObjectId(req.params[0])];
    var user = req.jiqiyu.user = req.session.user;
    if (!Fn.auth(user, 'author', ul)) {
        return res.send('權限不足，<a href="/">點這裏去首頁</a>');
    }
    
    Post.delPostsById(pidArr, user, function(err, tag, cat, author) {
        if (err) {
            return res.send(err);
        }
        req.jiqiyu.tag = tag;
        req.jiqiyu.cat = cat;
        req.jiqiyu.author = author;
        next();
    });
    
};

exports.delRelatedPid = function(req, res) {

    Post.tagDelPid(req.jiqiyu.tag, function(err) {
        if (err) {
            return res.send(err);
        }
        Category.delPid(req.jiqiyu.cat, function(err) {
            if (err) {
                return res.send(err);
            }
            User.delPid(req.jiqiyu.author, function(err) {
                if (err) {
                    return res.send(err);
                }
                recountDb();
                res.redirect('/control-panel/post');
            });
        });
    });
    
};

exports.catNewForm = function(req, res) {

    var ref = req.query.ref || null;
    var catArr = [];
    catArr[0] = req.jiqiyu.cat.unfold;
    var catNum = catArr[0].length;
    var nPerPage = 5;
    var pages = (catNum % nPerPage) ? Math.floor(catNum / nPerPage) + 1 :
        catNum / nPerPage;
    var ipage = 0;
    var start, end;
    var pageNum = +req.query.p || 1;
    if (pages === 1) {
        pageNum = 0;
    } else if (pageNum < 1) {
        pageNum = 1;
    } else if (pageNum > pages) {
        pageNum = pages;
    }
    if (pages > 1) {
        while (ipage++ < pages) {
            start = (ipage - 1) * nPerPage;
            end = start + nPerPage;
            catArr[ipage] = catArr[0].slice(start, end);
        }
    }

    recountDb();
    res.render('category', { title: '管理分類 - MingRi.org',
                             cat: catArr[0],
                             catN: catArr[pageNum],
                             ul: ul,
                             name: req.cookies.name,
                             level: req.jiqiyu.user.level,
                             success : req.flash('success').toString(),
			                 error : req.flash('error').toString(),
                             deleted: req.flash('deleted').toString(),
                             deletionErr: req.flash('deletionErr').toString(),
                             pages: pages,
                             pageNum: pageNum,
                             documents: '文章數爲零的分類不會顯示在前台頁面；刪除一個含有文章的分類，會將其下文章移至默認分類'
                           });
    
};

exports.catNew = function(req, res) {

    if (!Fn.auth(req.session.user, 'editor', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    
    var cat = {};
    if (!(req.body.parent = Fn.getReqStr(req.body.parent)) ||
        !(req.body.catname = Fn.getReqStr(req.body.catname))) {
        return res.send('error #762,36');
    }
    var parent = req.body.parent.split(',');   
    cat.name = req.body.catname;
    if (catname.length > 20) {
        return res.send('error #772,36');
    }
    cat.depth = (+parent[1] + 1) || 0;
    cat.haschildren = false;
    if (req.body.parent !== 'nil') {
        if (isNaN(+parent[1]) || !Fn.isObjectIdString(parent[0])) {
            return res.send('error #774,40');
        }
        cat.id = req.body.catname.concat(parent[0]);
        cat.parent = ObjectId(parent[0]);
    }
    if (Fn.getReqStr(req.body.description)) {
        cat.description = req.body.description;
    }
    Category.catNew(cat, [cat.parent], function(err, doc) {
        if (err) {
            req.flash('error', '添加分類目錄失敗：' + err);
            return res.redirect('/control-panel/category');
        } else {
            req.flash('success', '成功新增了一個分類目錄');
            return res.redirect('/control-panel/category');
        }
    });
    
};

// todo: data validation
exports.catEdit = function(req, res) {

    var user = req.session.user;
    if (!Fn.auth(user, 'editor', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    // var catObj = req.body.obj;
    // if ()
    Category.edit(req.body.obj, function(err, data) {
        if (err) {
            return res.send({err: err});
        }
        res.send(data);
    });
    
};

exports.catDelOne = function(req, res) {

    var user = req.session.user;
    if (!Fn.auth(user, 'editor', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    if (!Fn.isObjectIdString(req.query.id)) {
        return res.send('####error#### action.js #791,54');
    }
    var cat = [ObjectId(req.query.id)];
    var subcat = req.query.subcat ?
        req.query.subcat.split(',') : [];
    var i, sl = subcat.length;
    for (i=0; i<sl; i++) { subcat[i] = ObjectId(subcat[i]); }
    Category.del(cat, [subcat], function(err, defaultCat, pidObjArr) {
        if (err) {
            req.flash('deletionErr', '刪除失敗：' + err);
            return res.redirect('control-panel/category');
        }
        if (pidObjArr.length) {
            Category.change(cat, defaultCat, pidObjArr, function(err, result) {
                if (err) { console.log('####error#### action.js #805,69'); }
                req.flash('deleted', '分類已刪除');
                return res.redirect('control-panel/category');
            });
        } else {
            req.flash('deleted', '分類已刪除');
            return res.redirect('control-panel/category');
        }
    });
    
};

exports.editPostForm = function(req, res) {

    var user = req.jiqiyu.user = req.session.user;
    if (!Fn.auth(user, 'author', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    var pid = ObjectId(req.params[0]);
    var at = pid.getTimestamp();
    var au = Fn.getReqStr(req.query.au);
    var tag = Fn.getReqStr(req.query.tag);
    
    var authorList = [];
    var currUser = {};
    currUser._id = user._id;
    currUser.name = req.cookies.name;
    currUser.level = user.level;
    authorList.push(currUser);
    
    Post.getPostById(pid, function(err, doc) {
        if (err) {
            return res.send('文章加載出錯');
        } else {
            if (user._id !== doc.authorid.toString()) {
                if (user.level === ul.author ||
                    doc.state === pstate.ppost ||
                    doc.state === pstate.ontop + pstate.ppost ||
                    (doc.level && user.level <= doc.level) ) {
                    return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
                }
                authorList.push({
                    '_id': doc.authorid,
                    'name': au,
                    'level': doc.level || ul.author
                });
            }
            recountDb();
            res.render('editPost', {
                title: '編輯文章 - MingRi.org',
                pid: pid,
                ptitle: doc.title,
                content: doc.original,
                draft: doc.state ? false : true,
                commentoff: doc.commentoff ? 'checked' : '',
                isprivate: (doc.state === 2 ||
                            doc.state === 5) ? 'checked' : '',
                ontop: (doc.state === 3 ||
                        doc.state === 5) ? 'checked' : '',
                authorid: doc.authorid,
                tag: tag,
                catid: doc.catid,
                year: at.getFullYear(),
                month: at.getMonth(),
                day: at.getDate(),
                hour: at.getHours(),
                minute: at.getMinutes(),
                second: at.getSeconds(),
                cat: req.jiqiyu.cat,
                name: req.cookies.name,
                level: req.jiqiyu.user.level,
                postlevel: doc.level || false,
                ul: ul,
                authorList: authorList,
                last_edit: ('此前更新於' + new Date(doc.last_edit).toLocaleString("zh-Hans-CN") + ' By ' + (doc.last_edit_user || '')) || '',
                referrer: req.query.ref || '',
                appointed_time: (doc.appointed_time && !doc.state) ?
                    doc.appointed_time : false,
                documents: ''
            });
        }
    });
    
};

exports.editPostProp = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};

    var user = req.jiqiyu.user = req.session.user;
    if (!Fn.auth(user, 'author', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    
    req.jiqiyu.pid = ObjectId(req.params[0]);
    req.jiqiyu.draftProp = {};
    
    Post.getPostById(req.jiqiyu.pid, function(err, doc) {
        if (err) {
            return res.send('文章加載出錯');
        }
        if (user._id !== doc.authorid.toString() &&
            user.level <= doc.level) {
            return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
        }
        req.jiqiyu.former = {
            title: doc.title,
            // content: doc.original,
            // author: doc.authorid,
            // tag: doc.tagid,
            category: doc.catid[0],
            at: doc.appointed_time,
            pstate: doc.state,
            more: doc.more,
            year: doc.year,
            month: doc.month,
            commentoff: Fn.parseBool(doc.commentoff),
            ontop: Fn.parseBool(doc.ontop),
            isprivate: Fn.parseBool(doc.isprivate),
            draft: !Fn.parseBool(doc.state)
        };

        if (req.jiqiyu.former.draft && req.body.pstate === undefined) {
            req.jiqiyu.saveDraft = true;
        }

        if (Fn.isPostState(req.body.pstate)) { // post state changed
            if (req.jiqiyu.former.pstate === 0) {
                req.jiqiyu.decDraftCounter = true;
                if (req.former.isprivate && req.jiqiyu.former.ontop) {
                    if (req.body.ontop !== undefined &&
                        req.body.isprivate !== undefined) {
                        req.jiqiyu.incPostCounter = true;
                    } else if (req.body.ontop !== undefined) {
                        req.jiqiyu.incPpostCounter = true;
                    } else if (req.body.isprivate !== undefined) {
                        req.jiqiyu.incTopCounter = true;
                    } else {
                        req.jiqiyu.incTopCounter = true;
                    }
                } else if (req.jiqiyu.former.isprivate) {
                    if (req.body.isprivate !== undefined &&
                        req.body.ontop !== undefined) {
                        req.jiqiyu.incTopCounter = true;
                    } else if (req.body.isprivate !== undefined) {
                        req.jiqiyu.incPostCounter = true;
                    } else if (req.body.ontop !== undefined) {
                        req.jiqiyu.incTopCounter = true;
                    } else {
                        req.jiqiyu.incPpostCounter = true;
                    }
                } else if (req.jiqiyu.former.ontop) {
                    if (req.body.isprivate !== undefined &&
                        req.body.ontop !== undefined) {
                        req.jiqiyu.incPpostCounter = true;
                    } else if (req.body.isprivate !== undefined) {
                        req.jiqiyu.incTopCounter = true;
                    } else if (req.body.ontop !== undefined) {
                        req.jiqiyu.incPostCounter = true;
                    } else {
                        req.jiqiyu.incTopCounter = true;
                    }
                } else {
                    if (req.body.isprivate !== undefined &&
                        req.body.ontop !== undefined) {
                        req.jiqiyu.incTopCounter = true;
                    } else if (req.body.isprivate !== undefined) {
                        req.jiqiyu.incPpostCounter = true;
                    } else if (req.body.ontop !== undefined) {
                        req.jiqiyu.incTopCounter = true;
                    } else {
                        req.jiqiyu.incPostCounter = true;
                    }
                }
                next();
            }
            if (req.jiqiyu.former.pstate === 1) {
                if (req.body.ontop !== undefined &&
                    req.body.isprivate !== undefined) {
                    // post -> top+priv (1to5)
                    if (Fn.parseBool(req.body.isprivate)
                        && Fn.parseBool(req.body.ontop)) {
                        req.jiqiyu.state = pstate.ppost + pstate.ontop;
                        req.jiqiyu.decPostCounter = true;
                        req.jiqiyu.incTopCounter = true;
                    }
                } else if (req.body.ontop !== undefined) { 
                    // post -> top (1to3)
                    if (Fn.parseBool(req.body.ontop)) {
                        req.jiqiyu.state = pstate.ontop;
                        req.jiqiyu.decPostCounter = true;
                        req.jiqiyu.incTopCounter = true;
                    }
                } else if (req.body.isprivate !== undefined) {
                    // post-> priv (1to2)
                    if (Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.ppost;
                        req.jiqiyu.decPostCounter = true;
                        req.jiqiyu.incPpostCounter = true;
                    }
                }
            }
            if (req.jiqiyu.former.pstate === 2) {
                if (req.body.ontop !== undefined &&
                    req.body.isprivate !== undefined) {
                    // priv -> top (2to3)
                    if (Fn.parseBool(req.body.ontop) &&
                        !Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.ontop;
                        req.jiqiyu.decPpostCounter = true;
                        req.jiqiyu.incTopCounter = true;
                    }
                } else if (req.body.ontop !== undefined) {
                    // priv -> priv+top (2to5)
                    if (Fn.parseBool(req.body.ontop)) {
                        req.jiqiyu.state = pstate.ontop + pstate.ppost;
                        req.jiqiyu.decPpostCounter = true;
                        req.jiqiyu.incTopCounter = true;
                    }
                } else if (req.body.isprivate !== undefined) {
                    // priv -> post (2to1)
                    if (!Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.post;
                        req.jiqiyu.decPpostCounter = true;
                        req.jiqiyu.incPostCounter = true;
                    }
                }
            }
            if (req.jiqiyu.former.pstate === 3) {
                if (req.body.ontop !== undefined &&
                    req.body.isprivate !== undefined) {
                    // top -> post (3to2)
                    if (!Fn.parseBool(req.body.ontop) &&
                        Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.ppost;
                        req.jiqiyu.decTopCounter = true;
                        req.jiqiyu.incPpostCounter = true;
                    }
                } else if (req.body.ontop !== undefined) {
                    // top -> priv (3to1)
                    if (!Fn.parseBool(req.body.ontop)) {
                        req.jiqiyu.state = pstate.post;
                        req.jiqiyu.decTopCounter = true;
                        req.jiqiyu.incPostCounter = true;
                    }
                } else if (req.body.isprivate !== undefined) {
                    // top -> top+priv (3to5)
                    if (Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.ontop + pstate.ppost;
                    }
                }
            }
            if (req.jiqiyu.former.pstate === 5) {
                if (req.body.ontop !== undefined &&
                    req.body.isprivate !== undefined) {
                    // top+priv -> post (5to1)
                    if (!Fn.parseBool(req.body.ontop) &&
                        !Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.post;
                        req.jiqiyu.decTopCounter = true;
                        req.jiqiyu.incPostCounter = true;
                    }
                } else if (req.body.ontop !== undefined) {
                    // top+priv -> priv (5to2)
                    if (!Fn.parseBool(req.body.ontop)) {
                        req.jiqiyu.state = pstate.ppost;
                        req.jiqiyu.decTopCounter = true;
                        req.jiqiyu.incPpostCounter = true;
                    }
                } else if (req.body.isprivate !== undefined) {
                    // top+priv -> top (5to3)
                    if (!Fn.parseBool(req.body.isprivate)) {
                        req.jiqiyu.state = pstate.ontop;
                    }
                }
            }
            next();
        } else { // post state unchanged
            if (req.jiqiyu.saveDraft) {
                if (req.body.isprivate !== undefined) {
                    req.jiqiyu.draftProp.isprivate =
                        Fn.parseBool(req.body.isprivate);
                }
                if (req.body.ontop !== undefined) {
                    req.jiqiyu.draftProp.ontop =
                        Fn.parseBool(req.body.ontop);
                }
            }
            next();
        }
    });
    
};

exports.editPostCat = function(req, res, next) {

    var state = +req.body.pstate || req.jiqiyu.former.pstate;
    if (!Fn.isPostState(state)) {
        return res.send('error #1025,37');
    }
    if (state === pstate.draft) {
        next();
    }
    if (Fn.isObjectIdString(req.body.category) && !req.body.newcatname) {
        Category.change(
            [req.jiqiyu.former.category],
            ObjectId(req.body.category),
            [{
                pid: req.jiqiyu.pid,
                state: +state,
                formerState: +req.jiqiyu.former.pstate
            }],
            function(err, result) {
                if (err) {
                    console.log('####error#### action.js #1119,63');
                }
                next();
            });
    } else if (req.body.newcatname = Fn.getReqStr(req.body.newcatname)) { 
        if (!Fn.auth(req.jiqiyu.user, 'editor', ul)) {
            return res.send('no privilege');
        }
        var cat = {};
        cat.name = req.body.newcatname;
        if (!cat.name.length || cat.name.length > 20) {
            return res.send('invalid newcatname');
        }
        cat.haschildren = false;
        cat.depth = 0;
        if (req.body.parentid !== 'nil' &&
            (req.body.parentid = Fn.getReqStr(req.body.parentid))) {
            if (Fn.isObjectIdString(req.body.parentid.split(',')[0])) {
                cat.parent = ObjectId(req.body.parentid.split(',')[0]);
                if (!isNaN(+req.body.parentid.split(',')[1])) {
                    cat.depth = +req.body.parentid.split(',')[1] + 1;
                }
            }
        }
        
        switch (+state) {
        case pstate.draft:
            break;
        case pstate.ppost + pstate.ontop:
        case pstate.ppost:
            cat.ppostid = [req.jiqiyu.pid];
            break;
        default: // when pstate is post or ontop
            cat.postid = [req.jiqiyu.pid];
        }
        Category.catNew(
            cat,
            [cat.parent],
            function(err, doc) {
                if (err) {
                    console.log('####error#### action.js #1159,63');
                    return res.send(err);
                }
                req.jiqiyu.newCatIdArr = [];
                doc.forEach(function(el) {
                    req.jiqiyu.newCatIdArr.push(el._id);
                });
                Category.delPid(
                    [{
                        id: [req.jiqiyu.former.category],
                        pid: cat.postid ? cat.postid[0] : '',
                        ppid: cat.ppostid ? cat.ppostid[0] : ''
                    }],
                    function(err) {
                        if (err) {
                            console.log('####error#### action.js #1174,71');
                        }
                        next();
                    });
            });
    } else if (state) {
        Category.change(
            [req.jiqiyu.former.category],
            req.jiqiyu.former.category,
            [{
                pid: req.jiqiyu.pid,
                state: +state,
                formerState: +req.jiqiyu.former.pstate
            }],
            function(err, result) {
                if (err) {
                    console.log('####error#### action.js #1190,63');
                }
                next();
            });
    } else { next(); }

};

exports.allTags = function(req, res) {

    req.jiqiyu = req.jiqiyu || {};
    var user = req.session.user;
    Tag.all(function(err, docs) {
        if (err) {
            req.jiqiyu.tag = '標籤加載失敗了，可刷新頁面重試'
        } else if (docs.length === 0) {
            req.jiqiyu.tag = '暫無'
        } else {
            req.jiqiyu.tag = docs;
            req.jiqiyu.tag.forEach(function(el) {
                if (el.postid && el.postid.length) {
                    el.npost = el.postid.length;
                } else { el.npost = 0; }
            });
        }
        res.render('tag', {title: '管理標籤',
                           name: req.cookies.name,
                           level: +user.level,
                           ul: ul,
                           postsMoreThan: -1,
                           tag: req.jiqiyu.tag,
                           documents: '刪除一個標籤，不會刪除標記在該標籤下的文章'
                          });
    });

};

exports.delTagById = function(req, res) {

    var user = req.session.user;
    if (!user || !user.level || (user.level < ul.editor) ) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    var tagid = ObjectId(req.params[0]);
    Tag.delById(tagid, function(err) {
        res.send(err);
    });

};

exports.tagRename = function(req, res) {

    var user = req.session.user;
    if (!Fn.auth(user, 'editor', ul)) {
        return res.send('權限不足，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    var tagid = ObjectId(req.params[0]);
    var newname = Fn.trim(req.query.newname);
    
    if (/,+/.test(newname) || newname.length > 20 ) {
        return res.send('標籤名格式不對，<a href="javascript:history.back();">返回</a>');
    }
    
    Tag.rename(tagid, newname, function(err) {
        res.send(err);
    });
    
};

exports.submitEdits = function(req, res) {

    var article = {};

    if (Fn.isPostState(req.body.pstate)) {
        article.state = +req.body.pstate;
    }
    var state = article.state || +req.jiqiyu.former.pstate;
    if (req.body.tag !== undefined && Fn.getReqStr(req.body.tag)) {
        article.tagid = req.jiqiyu.tagId;
        Tag.updatePostId(
            req.body.untag,
            req.body.ntag,
            req.jiqiyu.pid,
            state,
            req.jiqiyu.former.pstate
        );
    } else if (article.state) {
        if (Fn.getReqStr(req.body.former.tag)) {
            var tagArr = req.body.former.tag.split(',');
            Tag.updatePostId(tagArr, tagArr, req.jiqiyu.pid,
                             state, req.jiqiyu.former.pstate);
        }
    }
    if (req.body.commentoff !== undefined) {
        article.commentoff = Fn.parseBool(req.body.commentoff);
    }
    if (Fn.isObjectIdString(req.body.category) && !req.body.newcatname) {
        article.catid = [ObjectId(req.body.category)];
    }
    if (req.jiqiyu.newCatIdArr && req.jiqiyu.newCatIdArr.length > 0) {
        article.catid = req.jiqiyu.newCatIdArr;
    }
    if (req.body.title !== undefined) {
        article.title = Fn.getReqStr(req.body.title);
        if (!article.title) {
            return res.send('標題不可以留空');
        }
    }
    if (req.body.content !== undefined) {
        article.original =  Fn.getReqStr(req.body.content);
        if (!article.original || article.original === '[[!more]]') {
            return res.send('內容不可以留空');
        }
        var tempstring = Fn.getReqStr(req.body.content)
                           .replace(/<([^> ]+)/gi,"&lt;$1")
                             .replace(/<\/([^> ]+)/gi, "&lt;$1");

        var i = 0, props, matches = [];
        var css = '';
        var reCode = /\n*```([a-zA-z]*)\s*/;
        var reImg = /&lt;img[^>]+>/gi;
        var reProps = /&lt;img[^>]+?((?:src|style|title|alt)=(?:"[^"]*"|'[^']*'))[^>]*>/i;
        var imgArr = tempstring.match(reImg);
        var ilen = imgArr ? imgArr.length : 0;

        while ((matches = tempstring.match(reCode)) !== null) {
            ++i;
            if (matches[1] === 'unknown' || matches[1] === 'nohighlight') {
                css = 'class="no-highlight"';
            } else if (matches[1]) {
                css = 'class="language-' + matches[1] + '"';
            }
            if (i % 2) {
                tempstring = tempstring.replace(matches[0], '\n\n<pre><code ' + css + '>');
            } else {
                tempstring = tempstring.replace(matches[0], '</code></pre>\n');
            }
        }

        if (ilen) {
            var imgArrCopy = tempstring.match(reImg);
            var safeImgArr = [];
            for (props='', i=0; i<ilen; props='', i++) {
                while ((matches = imgArrCopy[i].match(reProps)) !== null) {
                    imgArrCopy[i] = matches[0].replace(matches[1], '');
                    props += ' ' + matches[1];
                }
                safeImgArr[i] = '<img' + props + '>';
            }
            for (i=0; i<ilen; i++) {
                tempstring = tempstring.replace(imgArr[i], safeImgArr[i]);
            }
        }
        
        tempstring = parser.render(tempstring);
        
        if (req.body.more !== undefined) {
            var reMore = /\[\[\!more\]\]/gi;
            if (isNaN(+req.body.more) || +req.body.more === -1) {
                article.more = false;
            } else {
                article.more = tempstring.indexOf('[[!more]]');
                if (article.more === -1) {
                    article.more = false;
                    console.log('error of cannot find [[!more]]');
                } else {
                    tempstring = tempstring.replace(reMore, '');
                }
            }
        } else {
            if (!isNaN(+req.jiqiyu.former.more) &&
                +req.jiqiyu.former.more !== -1) {
                tempstring = tempstring.replace(reMore, '');
            }
        }
        article.content = tempstring;
    }
    if (Fn.chkTimestamp(req.body.at)) {
        article.appointed_time = +req.body.at;
        article.year = new Date(+req.body.at).getFullYear();
        article.month = new Date(+req.body.at).getMonth();
        if (req.jiqiyu.draftProp.isprivate !== undefined) {
            article.isprivate = req.jiqiyu.draftProp.isprivate;
        }
        if (req.jiqiyu.draftProp.ontop !== undefined) {
            article.ontop = req.jiqiyu.draftProp.ontop;
        }
    }
    // if (req.body.author = Fn.getReqStr(req.body.author)) {
    //     var au = req.body.author.split(',');
    //     if (Fn.isObjectIdString(au[0])) {
    //         // return res.send('error');
    //     }
    //     article.authorid = ObjectId(au[0]);
    //     if (+au[1] > ul.author) {
    //         article.level = +au[1];
    //     }
    //     // User.switchAuthor();
    // }
    if (/^\d{13}$/.test(req.body.last_edit)) {
        article.last_edit = +req.body.last_edit;
    }
    article.last_edit_user = req.cookies.name;
    Post.edit(req.jiqiyu.pid, article, function(err, result) {
        if (err) { return res.send('出錯了'); }
        var resp = ' 文章已更新 | <a href="/post/' +req.params[0]+ '">看下</a>';
        res.send({
            result: resp,
            last_edit: '此前更新於' +
                new Date(article.last_edit).toLocaleString("zh-Hans-CN") +
                ' by ' + req.cookies.name,
            catIdArr: req.jiqiyu.newCatIdArr
        });
    });

};

exports.saveDraft = function(req, res) {

    // todo

};

exports.uploads = function(req, res) {

    if (!Fn.auth(req.session.user, 'author', ul)) {
        return res.send('權限不足');
    }

};

exports.uploading = function(req, res) {

    if (!Fn.auth(req.session.user, 'author', ul)) {
        return res.send('權限不足');
    }
    
    var name = req.files.file.name;
    var size = req.files.file.size;
    var type = req.files.file.type;
    var oldPath = req.files.file.path;
    var newPath =  path.join(__dirname, '../public') + "/uploads/" + name;
    if (name !== '' && size !== 0) {
        if (size > 2097152) {
            var msg = '!! 只可以上傳小於2兆（2097152字節）的文件';
            fs.unlinkSync(oldPath);
            return res.render('partial/uploadDone', {msg: msg});
        }
        switch (true) {
        case type.indexOf('image/') === 0:
            var image = true;
            break;
        case type.indexOf('text/') === 0:
            var txt = true;
            break;
        case type.indexOf('audio/') === 0:
            var audio = true;
            break;
        case type.indexOf('video/') === 0:
            var video = true;
            break;
        case type.indexOf('/msword') ===
                type.length - 1 - 'msword'.length:
            var msword = true;
            break;
        default:
            var msg = '!! 只可以上傳媒體文件（圖片/音頻/視頻）或普通文檔（txt/html/word）';
            fs.unlinkSync(oldPath);
            return res.render('partial/uploadDone', {msg: msg});
        }
        fs.rename(oldPath, newPath, function(err) {
            if (err) {
                var is = fs.createReadStream(oldPath);
                var os = fs.createWriteStream(newPath);
                is.pipe(os);
                is.on('end', function() {
                    fs.unlinkSync(oldPath);
                });
            }
            var msg = "文件已上傳";
            var url = {};
            url.src = '/uploads/' + encodeURIComponent(name);
            if (image) {
                url.markdown = '![' + name + '](' + url.src + ')';
                url.html = '<img src="' + url.src + '" style=\'\' alt="' + name + '" title="' + name + '">';
            }
            res.render('partial/uploadDone', {
                msg: msg,
                name: name,
                type: type,
                size: size,
                url: url,
                image: image,
                audio: audio,
                video: video,
                msword: msword
            });
        });
    } else {
        var msg = '!! No file or empty file';
        return res.render('partial/uploadDone', {msg: msg});
    }

};