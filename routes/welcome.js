/*
 * Open the site for the first time
 */

var User = require('../models/user');
var catNew = require('../models/category').catNew;

exports.superuser = function(req, res) {

    User.count(function(err, count) {
        if (err === 'no user') { // open for the first time
            res.render('welcome', {'title': '第一次打開系統'});
        } else if (err) {
            return res.send(err);
        } else {
            return res.send('該頁面已過期，<a href="javascript:history.back();">返回上一頁</a>');
        }
    });

};

// todo: data validation
exports.addsu = function(req, res) {

    var name = req.body.suname.replace(/^\s+|\s+$/g, '');
    var psw1 = req.body.psw1;
    var psw2 = req.body.psw2;

    if (!name.length || name.length > 20) {
        return res.send('用戶名爲空或過長，<a href="javascript:history.back();">返回</a>');
    }
    if (psw1 !== psw2) {
        return res.send('兩次密碼輸入得不一樣，<a href="javascript:history.back();">返回</a>');
    }
    if (psw1.length < 6) {
        return res.send('密碼不應少於六位，<a href="javascript:history.back();">返回</a>');
    }
    psw1 = require('crypto')
             .createHash('md5')
               .update(psw1)
                 .digest('hex');

    var user = {'name': name, 'password': psw1, 'level': 3};
    User.add(user, function(err, doc) {
        if (err) {
            res.send(err);
        }
        var defaultCat = {'name': '未分類',
                          'isdefault': true,
                          'depth': 0,
                          'haschildren': false
                         };
        var parentidArr = [];
        catNew(defaultCat, parentidArr, function(err) {
            if (err) {
                return res.send(err);
            }
            res.cookie('name', user.name, {expires: 0});
            res.cookie('level', user.level, {expires: 0});
            req.session.cookie.expires = false;
            req.session.user = {'_id': user._id, 'level': user.level};
            res.redirect('/'); 
        });
    });

};