/*
 * Module dependencies
 */

var http = require('http');
var path = require('path');
var express = require('express');
var MongoStore = require('connect-mongo')(express);
var flash = require('connect-flash');

var routes = require('./routes');
var welcome = require('./routes/welcome');
var cpanel = require('./routes/cpanel');
var actions = require('./routes/actions');
var conf = require('./conf');

var app = express();

// global
__indexCache = conf.cache.index ?
    { /* appointPosts, topPosts, posts, pageInfo, cat, tag */ } : -1;

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());
app.use(express.session({
    secret: conf.cookieSecret,
    cookie: {
        maxAge: null, // 3600000 * 24,
        httpOnly: true
    },
    store: new MongoStore({
        db: conf.db.db
    })
}));
app.use(flash());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/welcome', welcome.superuser);
app.post('/welcome', welcome.addsu);

app.get('/',
        routes.reqBegin,
        routes.checkAppointment,
        routes.getOnTop,
        routes.getIndexPosts,
        routes.onTopGetNameById,
        routes.getNameById,
        actions.loadCategoryTree,
        routes.tagcloud,
        routes.index);

app.get(/^\/post\/page\/(\d+)\/?$/,
        routes.getPage,
        routes.getNameById,
        actions.loadCategoryTree,
        routes.tagcloud,
        routes.page);

app.get(/^\/post\/(\w{24})\/?$/, routes.thePost);

app.get(/^\/category\/(.+)\/?$/, routes.getPostsInCategory);
app.get(/^\/tag\/([^,]+)\/?$/,
        routes.reqBegin,
        routes.getTaggedPosts);

app.get('/login', cpanel.loginForm);
app.get('/logout', cpanel.logout);
app.post('/login', cpanel.login);

app.get('/control-panel',
        cpanel.contentStat,
        routes.tagcloud,
        cpanel.userStat,
        cpanel.recentComments,
        cpanel.index);

app.get('/control-panel/user', cpanel.manageUser);
// app.get('/control-panel/user/center', cpanel.userCenter);
app.post('/control-panel/user/add', actions.adduser);
app.get(/^\/control\-panel\/user\/del\/(\w{24})\/?$/, actions.delUser);
app.post(/^\/control\-panel\/user\/edit\/(.+)\/?$/, actions.editUser);

app.get('/control-panel/post',
         cpanel.getIndexPosts,
         routes.onTopGetNameById,
         routes.getNameById,
         cpanel.managePost);
app.get(/^\/control-panel\/post\/page\/(\d+)\/?$/,
        cpanel.cpGetPage,
        routes.getNameById,
        cpanel.page);

app.get('/control-panel/post/new',
        actions.loadCategoryTree,
        actions.loadAuthor,
        actions.postNewForm);
app.post('/control-panel/post/new',
         actions.getTagId,
         actions.getCatId,
         actions.postNew,
         actions.upsProperty,
         actions.postRelatedFields,
         actions.post);

app.get(/^\/control\-panel\/post\/delete\/(\w{24})\/?$/,
        actions.delPostsById,
        actions.delRelatedPid);

app.get(/^\/control\-panel\/post\/edit\/(\w{24})\/?$/,
        actions.loadCategoryTree,
        actions.editPostForm);
app.post(/^\/control\-panel\/post\/edit\/(\w{24})\/?$/,
         actions.editPostProp,
         actions.getTagId,
         actions.editPostCat,
         actions.upsProperty,
         actions.submitEdits);

app.get('/control-panel/category',
        actions.loadCategoryTree,
        actions.catNewForm);
app.post('/control-panel/category/new', actions.catNew);
app.get(/^\/control\-panel\/category\/delete\/([^?]+)\/?$/, actions.catDelOne);
app.post(/^\/control\-panel\/category\/edit\/(\w{24})\/?$/, actions.catEdit);

app.get('/control-panel/tag', actions.allTags);
app.get(/^\/control\-panel\/tag\/delete\/(\w{24})\/?$/, actions.delTagById);
app.get(/^\/control\-panel\/tag\/edit\/(\w{24})\/?$/, actions.tagRename);

app.get('/control-panel/uploads', actions.uploads);
app.post('/control-panel/uploads', actions.uploading);

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});