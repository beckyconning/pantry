'use strict';

var T        = require('tcomb');
var validUrl = require('valid-url');
var Promise  = require('bluebird');
var Kefir    = require('kefir');

T.Property = T.subtype(T.Obj, function (o) { return o instanceof Kefir.Property;         }, 'Property');
T.Stream   = T.subtype(T.Obj, function (o) { return o instanceof Kefir.Stream;           }, 'Stream');
T.Promise  = T.subtype(T.Obj, function (o) { return o instanceof Promise;                }, 'Promise');
T.Url      = T.subtype(T.Str, function (s) { return validUrl.isWebUri(s);                }, 'Url');
T.Doc      = T.subtype(T.Obj, function (o) { return T.Str.is(o._id) && T.Str.is(o._rev); }, 'Doc');

T.Change       = T.struct({ 'rev': T.Str });
T.Result       = T.struct({ 'seq': T.Num, 'id': T.Str, 'deleted': T.maybe(T.Bool), 'changes': T.list(T.Change) });
T.Notification = T.struct({ 'last_seq': T.Num, 'results': T.list(T.Result) });
T.View         = T.struct({ 'update_seq': T.Num, 'rows': T.list(T.Doc) });
T.Collection   = T.dict(T.Str, T.Doc, 'Collection');

// `stream` combinator, makes stream values typesafe
T.stream = function (type) {
    if (!T.Type.is(type)) {
        throw new TypeError('Incorrect `type` argument supplied to `stream` combinator');
    }

    var Stream = function (stream) { return T.Stream(stream).map(type); };

    Stream.meta = { kind: 'stream', type: type };

    Stream.is = function (x) {
      return T.Stream.is(x) && x.type === type;
    };

    return Stream;
};

module.exports = T;
