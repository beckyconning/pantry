var Kefir = require('kefir');
var _     = require('underscore');
var T     = require('tcomb');

var Property = T.subtype(T.Obj, function (obj) {
    return obj instanceof Kefir.Property;
}, 'Property');

var Stream = T.subtype(T.Obj, function (obj) {
    return obj instanceof Kefir.Stream;
}, 'Stream');

var Url = T.subtype(T.Str, function (str) {
    return validUrl.isHttpUri(str) || validUrl.isHttpsUrl(str);
}, 'Url');

var Contents = T.func([Url, T.Str], Property);
var Put      = T.func([Url, T.Str, T.Obj], Stream);
var Pantry   = T.struct({ contents: Contents, put: Put });

var contents = Contents.of(function (databaseUrl, docType) {
    return Kefir.constant(0);
});

var put = Put.of(function (databaseUrl, docType, doc) {
    return Kefir.never();
});

module.exports = Pantry({ contents: contents, put: put });
