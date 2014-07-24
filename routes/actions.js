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

// exports.adduserForm = function(req, res) {
    
//     var user = req.session.user;
//     if (!user || !user.level || user.level < ul.editor) {
//         return res.send('你沒有新增用戶的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
//     }
//     recountDb();
//     res.render('adduser', {title: '新增用戶 - MingRi.org',
//                            name: req.cookies.name,
//                            level: user.level,
//                            ul: ul,
//                            success : req.flash('success').toString(),
// 			               error : req.flash('error').toString(),
//                            documents: '網站的用戶有四種權限級別：1. 普通用戶，可瀏覽文章及發表評論；2. 作者，除擁有普通用戶權限外，還可發佈文章和管理普通用戶的評論；3. 編輯，除擁有作者之權限外，還可發佈及管理文章分類和標籤、管理作者發佈的文章和評論； 4. 超級用戶，除擁有編輯之權限外，還可管理用戶（增刪用戶、編輯用戶資料、權限等）及其發佈的內容；一個站點只有一位超級用戶。另，所有用戶可管理自己發佈的內容。'
//                           });

// };

exports.adduser = function(req, res) {
    
    if (!req.session.user || !req.session.user.level ||
        req.session.user.level < ul.editor) {
        return res.send('你沒有添加用戶的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    if (!req.body.username || !req.body.pass1 || !req.body.pass2) {
        req.flash('error', '用戶名或密碼不可以留空');
        return res.redirect('/control-panel/user');
    }
    if (req.body.pass1 !== req.body.pass2) {
        req.flash('error', '密碼兩次輸入得不一樣');
        return res.redirect('/control-panel/user');
    }
    if (req.body.pass1.length < 6) {
        req.flash('error', '密碼太過短，至少要六位');
        return res.redirect('/control-panel/user');
    }
    var reEmail = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._%+-]+\.[a-zA-z]{2,6}$/);
    if (req.body.email && req.body.email.search(reEmail) === -1) {
        req.flash('error', '郵箱格式不對');
        return res.redirect('/control-panel/user');
    }
    var user = {"name": req.body.username,
                "password": require('crypto')
                              .createHash('md5')
                                .update(req.body.pass1)
                                  .digest('hex'),
                "level": +req.body.role,
                "email": req.body.email,
                "intro": req.body.intro || ''
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
    if (!user || !user.level || (user.level < ul.su) ) {
        return res.send('你沒有刪除用戶的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
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
    if (!user || !user.level || (user.level < ul.su) ) {
        return res.send('你沒有編輯用戶的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    
    var username = req.params[0];
    User.edit(username, req.body.obj, function(err) {
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
    if (req.url.indexOf('/control-panel') !== -1 &&
        (!user || !user.level || user.level < ul.author) ) {
        return res.send('你沒有發文章／編輯文章的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
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
                           documents: ''
                          });

};

exports.getTagId = function(req, res, next) {
    
    req.jiqiyu = req.jiqiyu || {};
    var user = req.jiqiyu.user = req.session.user;
    if (!user || !user.level || (user.level < ul.author) ) {
        return res.send('你沒有發文章的權限，<a href="/">點這裏去首頁</a>');
    }
    
    req.jiqiyu.tagId = [];
    req.jiqiyu.tagNew = [];

    if (req.body.tag !== undefined) {
        var tag = req.body.tag;
        // todo: 添加數據合法性驗證
        if (/^[\s,]*$/.test(tag)) {
            req.jiqiyu.tagArray = ['沒有標籤'];
        } else {
            var re0 = /(^[\s,]|[\s,]$)/g;
            var re1 = /\s+,+|,{2,}/g;
            while(re0.test(tag) || re1.test(tag)) {
                tag = tag.replace(re0, '').replace(re1, ',');
            }
            req.jiqiyu.tagArray = tag.split(',');
        }

        if (!req.jiqiyu.tagArray.length) {
            req.jiqiyu.tagArray = ['沒有標籤'];
        }
        
        Post.getTagId(req.jiqiyu.tagArray, function(err, doc) {
            if (err) { return res.send('!error! action.js line #172'); }
            if (doc) {
                var temp = [];
                doc.forEach(function(el) {
                    req.jiqiyu.tagId.push(el._id);
                    temp.push(el.name);
                });
                if (doc.length < req.jiqiyu.tagArray.length) {
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
                        return res.send('!error! action.js line #198');
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

// todo: 添加數據合法性驗證
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
    if (req.body.category) {
        req.jiqiyu.catId.push(ObjectId(req.body.category));
    } else if (req.body.newcatname && req.body.parentid) {
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
            req.jiqiyu.catNew.push({
                'name': req.body.newcatname,
                'depth': +tmp[1] + 1,
                'parent': ObjectId(tmp[0]),
                'haschildren': false,
            });
            parentidArr.push(ObjectId(tmp[0]));
        }
    } else {
        return res.send('錯誤：新分類名爲空，<a onclick="javascript:history.back();" style="cursor: pointer; border-bottom: 1px solid blue; color: blue">返回</a>');
    }

    if (req.jiqiyu.catNew.length) {
        Category.catNew(req.jiqiyu.catNew, parentidArr,
                        function(err, doc) {
                            if (err === '分類名重複了') {
                                return res.send('錯誤：分類名重複了，<a onclick="javascript:history.back();" style="cursor: pointer; border-bottom: 1px solid blue; color: blue">返回重填</a>');
                            }
                            if (err) {
                                return res.send('!error! action.js line #269');
                            }
                            doc.forEach(function(el) {
                                req.jiqiyu.catId.push(el._id);
                            });
                            next();
                        });
    } else { next(); }
    
};

// todo: 添加數據合法性檢驗
exports.postNew = function(req, res, next) {

    var user = req.jiqiyu.user;
    var post = {};
    post.title = req.body.title;

    post.original = req.body.content;
    var tempstring = req.body.content
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
        post.content = tempstring.replace('[[!more]]', '\n');
    } else {
        post.content = tempstring;
    }
    
    post.catid = req.jiqiyu.catId;
    post.tagid = req.jiqiyu.tagId;
    post.state = req.jiqiyu.state =
        (req.body.submitpost === "發佈" &&
         !req.body.appointed_time) ? pstate.post : pstate.draft;
    post.commentid = [];

    if (req.body.author) {
        var au = req.body.author.split(',');
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

    if (!req.body.appointed_time && post.state) {
        var d = new Date();
        post.year = d.getFullYear();
        post.month = d.getMonth() + 1;
    }

    if (req.body.commentoff) {
        post.commentoff = true;
    }
    if (req.body.isprivate) {
        if (post.state) {
            if (req.body.ontop) {
                post.state = req.jiqiyu.state =
                    pstate.ppost + pstate.ontop;
            } else {
                post.state = req.jiqiyu.state = pstate.ppost;
            }
        } else { // if post.state===pstate.draft
            post.isprivate = true;
        }
    }
    if (req.body.appointed_time) {            
        var n = new Date();
        var year = +req.body.year;
        var month = +req.body.month;
        var day = +req.body.day;
        var hour = +req.body.hour;
        var minute = +req.body.minute;
        var second = +req.body.second;
        if (/^\d{4}$/.test(year) &&
            /^\d{1,2}$/.test(month) &&
            /^\d{1,2}$/.test(day) &&
            /^\d{1,2}$/.test(hour) &&
            /^\d{1,2}$/.test(minute) &&
            /^\d{1,2}$/.test(second)) {
            var date = new Date(year, month, day, hour,
                                minute, second);
            if (date.getFullYear() === year &&
                date.getMonth() === month &&
                date.getDate() === day &&
                date.getHours() === hour &&
                date.getMinutes() === minute &&
                date.getSeconds() === second) {
                post.appointed_time = new Date(year, month, day, hour,
                                           minute, second).getTime();
                post.year = year;
                post.month = month + 1;
            } else {
                return res.send('appointed_time error!');
            }
        } else {
            return res.send('appointed_time error!');
        }
    }

    if (req.body.ontop) {
        if (post.state) {
            if (req.body.isprivate) {
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
            return res.send('!error! action.js line #377');
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
        
        if (req.jiqiyu.postDraft) {
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
                return res.send('!error! action.js line #454');
            }
            Post.catAddPid(
                req.jiqiyu.catId,
                req.jiqiyu.postId,
                req.jiqiyu.state,
                function(err) {
                    if (err) {
                        return res.send('!error! action.js line #462');
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
    if (!user || !user.level || user.level < ul.author) {
        return res.send('你沒有刪文章的權限，<a href="/">點這裏去首頁</a>');
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

    if (!req.session.user || req.session.user.level < ul.editor) {
        return res.send('你沒有添加分類的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    var cat = {};
    var parent = req.body.parent.split(',');
    cat.name = req.body.catname;
    cat.depth = (+parent[1] + 1) || 0;
    cat.haschildren = false;
    if (req.body.parent !== 'nil') {
        cat.id = req.body.catname.concat(parent[0]);
        cat.parent = ObjectId(parent[0]);
    }
    if (/^\s*$/.test(req.body.description) === false) {
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

exports.catEdit = function(req, res) {

    var user = req.session.user;
    if (!user || !user.level || (user.level < ul.editor) ) {
        return res.send('你沒有編輯分類的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    Category.edit(req.body.obj, function(err, data) {
        if (err) {
            return res.send({err: err});
        }
        res.send(data);
    });
    
};

exports.catDelOne = function(req, res) {

    var user = req.session.user;
    if (!user || !user.level || (user.level < ul.editor) ) {
        return res.send('你沒有編輯分類的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
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
                if (err) { console.log('################693'); }
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
    if (!user || !user.level || (user.level < ul.author) ) {
        return res.send('你沒有編輯文章的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    var pid = ObjectId(req.params[0]);
    var at = pid.getTimestamp();
    var au = req.query.au;
    var tag = req.query.tag;
    
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
                    return res.send('你沒有編輯此文章的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
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
                last_edit: doc.last_edit || '',
                referrer: req.query.ref || '',
                appointed_time: doc.appointed_time && !doc.state ?
                    doc.appointed_time : false,
                documents: ''
            });
        }
    });
    
};

exports.editPostProp = function(req, res, next) {

    req.jiqiyu = req.jiqiyu || {};
    var user = req.jiqiyu.user = req.session.user;
    if (!user || !user.level || (user.level < ul.author)) {
        return res.send('你沒有編輯文章的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }
    var author = req.body.former.author.split(',');
    if (user._id !== author[0] && user.level <= +author[1]) {
        return res.send('你沒有編輯此文章的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    req.jiqiyu.pid = ObjectId(req.params[0]);
    req.jiqiyu.draftProp = {};

    req.body.former.isprivate =
        Fn.parseBool(req.body.former.isprivate);
    req.body.former.ontop = Fn.parseBool(req.body.former.ontop);
    req.body.former.draft = Fn.parseBool(req.body.former.draft);
    
    if (req.body.former.draft && !req.body.at) {
        req.jiqiyu.postDraft = true;
    }
    if (req.body.isprivate !== undefined &&
        req.body.ontop !== undefined) {
        req.body.isprivate = Fn.parseBool(req.body.isprivate);
        req.body.ontop = Fn.parseBool(req.body.ontop);
        
        if (req.body.at) {
            req.jiqiyu.draftProp.isprivate = req.body.isprivate;
            req.jiqiyu.draftProp.ontop = req.body.ontop;
        }
        if (req.body.isprivate) { // make private
            if (req.body.ontop) {
                req.jiqiyu.state = pstate.ppost + pstate.ontop;
                req.jiqiyu.decPostCounter = !req.jiqiyu.postDraft;
            } else { // make private & cancel ontop
                req.jiqiyu.decTopCounter = !req.jiqiyu.postDraft;
            }
        } else { // make public
            if (req.body.ontop) {
                req.jiqiyu.state = pstate.ontop;
                req.jiqiyu.decPpostCounter = !req.jiqiyu.postDraft;
            } else { // make public & cancel ontop
                req.jiqiyu.decTopCounter = !req.jiqiyu.postDraft;
                req.jiqiyu.state = pstate.post;
            }
        }
    } else if (req.body.isprivate !== undefined) {
        req.body.isprivate = Fn.parseBool(req.body.isprivate);
        
        if (req.body.at) {
            req.jiqiyu.draftProp.isprivate = req.body.isprivate;
        }
        if (req.body.isprivate) {
            req.jiqiyu.state = req.body.former.ontop ?
                undefined : pstate.ppost;
            req.jiqiyu.decPostCounter = Fn.parseBool(req.jiqiyu.state);
        } else {
            req.jiqiyu.decPpostCounter = !req.jiqiyu.postDraft &&
                !req.body.former.ontop;
            req.jiqiyu.state = !req.body.former.ontop ?
                pstate.post : undefined;
        }
    } else if (req.body.ontop !== undefined) {
        req.body.ontop = Fn.parseBool(req.body.ontop);
        
        if (req.body.at) {
            req.jiqiyu.draftProp.ontop = req.body.ontop;
        }
        if (req.body.ontop) {
            req.jiqiyu.state = pstate.ontop;
            req.jiqiyu.decPpostCounter = req.body.former.isprivate;
            req.jiqiyu.decPostCounter = !req.jiqiyu.decPpostCounter;
        } else {
            if (req.body.former.isprivate) {
                req.jiqiyu.state = pstate.ppost;
            } else {
                req.jiqiyu.state = pstate.post;
            }
            req.jiqiyu.decTopCounter = !req.jiqiyu.postDraft;
        }
    }
    next();
    
};

exports.editPostCat = function(req, res, next) {

    var state = req.body.pstate || req.body.former.pstate;
    if (req.body.category && !req.body.newcatname) {
        Category.change(
            [ObjectId(req.body.former.category)],
            ObjectId(req.body.category),
            [{
                pid: req.jiqiyu.pid,
                state: +state,
                formerState: +req.body.former.pstate
            }],
            function(err, result) {
                if (err) {
                    console.log('!error! action.js line #710');
                }
                next();
            });
    } else if (req.body.newcatname) {
        if (req.jiqiyu.user.level < ul.editor) {
            return res.send('new cat error');
        }
        var cat = {};
        cat.name = req.body.newcatname;
        cat.haschildren = false;
        cat.parent = req.body.parentid === 'nil' ?
            undefined : ObjectId(req.body.parentid.split(',')[0]);
        cat.depth = req.body.parentid === 'nil' ?
            0 : +req.body.parentid.split(',')[1] + 1;
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
                    console.log('!error! action.js line #735');
                }
                req.jiqiyu.newcatid = doc;
                Category.delPid(
                    [{
                        id: [ObjectId(req.body.former.category)],
                        pid: cat.postid ? cat.postid[0] : '',
                        ppid: cat.ppostid ? cat.ppostid[0] : ''
                    }],
                    function(err) {
                        if (err) {
                            console.log('!error! action.js line #746');
                        }
                        next();
                    });
            });
    } else if (req.body.pstate) {
        Category.change(
            [ObjectId(req.body.former.category)],
            ObjectId(req.body.former.category),
            [{
                pid: req.jiqiyu.pid,
                state: +state,
                formerState: +req.body.former.pstate
            }],
            function(err, result) {
                if (err) {
                    console.log('!error! action.js line #762');
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
        return res.send('你沒有編輯標籤的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    var tagid = ObjectId(req.params[0]);
    Tag.delById(tagid, function(err) {
        res.send(err);
    });

};

exports.tagRename = function(req, res) {

    var user = req.session.user;
    if (!user || !user.level || (user.level < ul.editor) ) {
        return res.send('你沒有編輯標籤的權限，<a href="javascript:history.back();">點這裡返回上一頁</a>');
    }

    var tagid = ObjectId(req.params[0]);
    var newname = req.query.newname;
    Tag.rename(tagid, newname, function(err) {
        res.send(err);
    });
};

exports.submitEdits = function(req, res) {

    var article = {};

    if (req.body.pstate) {
        article.state = +req.body.pstate;
    }
    if (req.body.tag) {
        article.tagid = req.jiqiyu.tagId;
        var state = article.state || +req.body.former.pstate;
        Tag.updatePostId(
            req.body.untag,
            req.body.ntag,
            req.jiqiyu.pid,
            state,
            req.body.former.pstate
        );
    } else if (article.state) {
        var tagArr = req.body.former.tag.split(',');
        Tag.updatePostId(tagArr, tagArr, req.jiqiyu.pid,
                         state, req.body.former.pstate);
    }
    if (req.body.commentoff) {
        article.commentoff = req.body.commentoff;
    }
    if (req.body.category && !req.body.newcatname) {
        article.catid = [ObjectId(req.body.category)];
    }
    if (req.jiqiyu.newcatid) {
        article.catid = [req.jiqiyu.newcatid];
    }
    if (req.body.title) {
        article.title = req.body.title;
    }
    if (req.body.content) {
        article.original = req.body.content;
        var tempstring = req.body.content
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
            if (+req.body.more === -1) {
                article.more = false;
            } else {
                article.more = tempstring.indexOf('[[!more]]');
                if (article.more === -1) {
                    article.more = false;
                    console.log('error of cannot find [[!more]]');
                } else {
                    tempstring = tempstring.replace('[[!more]]', '', 'gi');
                }
            }
        } else {
            if (+req.body.former.more !== -1) {
                tempstring = tempstring.replace('[[!more]]', '', 'gi');
            }
        }
        article.content = tempstring;
    }
    if (req.body.at) {
        article.appointed_time = req.body.at;
        article.year = req.body.year;
        article.month = req.body.month;
        if (req.jiqiyu.draftProp.isprivate !== undefined) {
            article.isprivate = req.jiqiyu.draftProp.isprivate;
        }
        if (req.jiqiyu.draftProp.ontop !== undefined) {
            article.ontop = req.jiqiyu.draftProp.ontop;
        }
    }
    if (req.body.author) {
        var au = req.body.author.split(',');
        article.authorid = ObjectId(au[0]);
        if (+au[1] > ul.author) {
            article.level = +au[1];
        }
        // User.switchAuthor();
    }
    article.last_edit = '此前更新於' + req.body.last_edit + ' by ' + req.cookies.name;
    
    Post.edit(req.jiqiyu.pid, article, function(err, result) {
        if (err) { return res.send('出錯了'); }
        // todo: update user's postid, ppostid or draftid
        var resp = ' 文章已更新 | <a href="/post/' +req.params[0]+ '">看下</a>';
        res.send({
            result: resp,
            last_edit: article.last_edit,
            catid: req.jiqiyu.newcatid
        });
    });

};

exports.saveDraft = function(req, res) {

    //

};

exports.uploads = function(req, res) {

    if (!req.session.user || req.session.user.level < ul.author) {
        return res.send('權限不夠');
    }

};

exports.uploading = function(req, res) {

    if (!req.session.user || req.session.user.level < ul.author) {
        return res.send('你沒有上傳資料的權限');
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