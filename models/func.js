function Fn() {};

module.exports = Fn;

Fn.isEmptyObject = function(obj) {

    if (typeof obj === 'object') {
        if (obj === null) {
            return true
        }
        if (Array.isArray(obj)) {
            if (obj.length > 0) {
                return false;
            }
            return true;
        } else {
            if (Object.getOwnPropertyNames(obj).length === 0) {
                return true;
            }
        }
    }
    return false;
    
};

Fn.parseBool = function(arg) {

    switch (typeof arg) {
    case 'string':
        return /^true$|^on$/i.test(arg);
    case 'undefined':
        return false;
    case 'number':
        return arg !== 0;
    case 'object':
        return !isEmptyObject(arg);
    default:
        return arg;
    }

};

Fn.auth = function(
    userSession, /* req.session.user */
    geRoleStr, /* great equal than */
    ul /* conf.js userLevel */
) {
    if (!userSession || !userSession.level ||
        (userSession.level < ul[geRoleStr])) {
        return false;
    }
    return true;
};

Fn.trim = function(str) {

    return str.replace(/^\s+|\s+$/g, '');
    
};

Fn.getReqStr = function(arg) {

    return typeof arg === 'string' ? Fn.trim(arg) : false;
    
};

Fn.isObjectIdString = function(arg) {

    if (typeof arg === 'string') {
        return /\w{24}/.test(arg);
    } else {
        return false;
    }
    
};

Fn.isRole = function(arg) {

    if (typeof arg === 'number' || typeof arg === 'string') {
        return /^[0123]$/.test(arg);
    } else {
        return false;
    }
    
};

Fn.isPostState = function(arg) {

    if (typeof arg === 'number' || typeof arg === 'string') {
        return /^[01235]$/.test(arg);
    } else {
        return false;
    }
    
};

Fn.reqAppointTime = function(year, month, day, hour, minute, second) {

    var year = +year, month = +month, day = +day,
    hour = +hour, minute = +minute, second = +second;
    if (/^\d{4}$/.test(year) &&
        /^\d{1,2}$/.test(month) &&
        /^\d{1,2}$/.test(day) &&
        /^\d{1,2}$/.test(hour) &&
        /^\d{1,2}$/.test(minute) &&
        /^\d{1,2}$/.test(second)) {
        var date = new Date(year, month, day, hour, minute, second);
        if (date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day &&
            date.getHours() === hour &&
            date.getMinutes() === minute &&
            date.getSeconds() === second) {
            var appointTime = new Date(year, month, day, hour,
                                           minute, second).getTime();
            if ((new Date().getTime()) > appointTime) {
                return false;
            }
            return appointTime;
        }
    }
    return false;

};

Fn.chkTimestamp = function(time) {

    var time = +time;
    var n = new Date().getTime();
    if (/^\d{13}$/.test(time)) {
        if (n < time) {
            return true;
        }
        return false;
    }
    return false;

};