'use strict';

var T        = require('tcomb');
var validUrl = require('valid-url');
var Promise  = require('bluebird');
var Kefir    = require('kefir')

T.Property    = T.subtype(T.Obj, function (o) { return o instanceof Kefir.Property;         }, 'Property');
T.Stream      = T.subtype(T.Obj, function (o) { return o instanceof Kefir.Stream;           }, 'Stream');
T.Promise     = T.subtype(T.Obj, function (o) { return o instanceof Promise;                }, 'Promise');
T.Url         = T.subtype(T.Str, function (s) { return validUrl.isWebUri(s);                }, 'Url');
T.ExistingDoc = T.subtype(T.Obj, function (o) { return T.Str.is(o._id) && T.Str.is(o._rev); }, 'ExistingDoc');

T.Collection = T.dict(T.ExistingDoc, 'Collection');

module.exports = T;
