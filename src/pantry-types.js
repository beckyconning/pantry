'use strict';

var T        = require('tcomb');
var validUrl = require('valid-url');
var Promise  = require('bluebird');
var Kefir    = require('kefir');

T.Property = T.irreducible('Property', function (o) { return o instanceof Kefir.Property; });
T.Stream   = T.irreducible('Stream', function (o) { return o instanceof Kefir.Stream; });
T.Promise  = T.irreducible('Promise', function (o) { return o instanceof Promise; });

T.WebUri = T.subtype(T.Str, function (s) { return !!validUrl.isWebUri(s); }, 'WebUri');
T.Doc    = T.subtype(T.Obj, function (o) { return T.Str.is(o._id) && T.Str.is(o._rev); }, 'Doc');

T.Response     = T.struct({ 'statusCode': T.Num, 'body': T.Obj });
T.Change       = T.struct({ 'rev': T.Str });
T.Result       = T.struct({ 'seq': T.Num, 'id': T.Str, 'deleted': T.maybe(T.Bool), 'changes': T.list(T.Change) });
T.Notification = T.struct({ 'last_seq': T.Num, 'results': T.list(T.Result) });
T.Row          = T.struct({ 'doc': T.Doc });
T.View         = T.struct({ 'update_seq': T.Num, 'rows': T.list(T.Row) });

T.Collection = T.dict(T.Str, T.Doc, 'Collection');

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

// `property` combinator, makes property values typesafe
T.property = function (type) {
    if (!T.Type.is(type)) {
        throw new TypeError('Incorrect `type` argument supplied to `property` combinator');
    }

    var Property = function (property) { return T.Property(property).map(type); };

    Property.meta = { kind: 'property', type: type };

    Property.is = function (x) {
      return T.Property.is(x) && x.type === type;
    };

    return Property;
};

// `promise` combinator, makes promise values typesafe
T.promise = function (type) {
    if (!T.Type.is(type)) {
        throw new TypeError('Incorrect `type` argument supplied to `promise` combinator');
    }

    var Promise = function (promise) { return T.Promise(promise).then(type); };

    Promise.meta = { kind: 'promise', type: type };

    Promise.is = function (x) {
      return T.Promise.is(x) && x.type === type;
    };

    return Promise;
};

module.exports = T;
