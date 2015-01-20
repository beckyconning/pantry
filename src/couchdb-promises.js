'use strict';

var T       = require('./pantry-types.js');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var successfulHttpStatusCode = T.func(T.Num, T.Bool)
    .of(function(httpStatusCode) {
        return Math.floor(httpStatusCode / 100) === 2;
    });

var throwIfUnsuccessfulResponse = T.func([T.Response, T.Any], T.Response)
    .of(function(response, body) {
        if (successfulHttpStatusCode(response.statusCode)) { return response; }
        else { throw new Error('HTTP Error:' + body); }
    });

var requestBody = T.func(T.Obj, T.promise(T.Obj))
    .of(function(options) {
        return request(options).spread(throwIfUnsuccessfulResponse).get('body');
    });

var putDoc = T.func([T.WebUri, T.Obj, T.Str], T.promise(T.Str))
    .of(function (dbUri, doc, id) {
        var url     = dbUri + '/' + id;
        var options = { method: 'PUT', json: true, uri: url, body: doc };

        // Resolve with the revision of the put doc
        return requestBody(options).get('rev');
    });

var getUuid = T.func(T.WebUri, T.promise(T.Str))
    .of(function (couchDbUri) {
        var url     = couchDbUri + '/_uuids';
        var options = { method: 'GET', json: true, uri: url };

        // Resolve with the first UUID from the body of the response
        var x = requestBody(options).get('uuids').get(0);

        return x;
    });

module.exports = { putDoc: putDoc, getUuid: getUuid };
