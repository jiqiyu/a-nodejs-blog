function Fn() {};

module.exports = Fn;

Fn.parseBool = function(arg) {

    switch (typeof arg) {
    case 'string':
        return /^true$/i.test(arg);
    case 'undefined':
        return false;
    case 'number':
        return arg !== 0;
    default:
        return arg;
    }

};