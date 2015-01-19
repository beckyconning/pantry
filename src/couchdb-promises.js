'use strict';

var Promise = require('bluebird');
var T       = require('./pantry-types.js');
var request = require('request');

// returns a promise that resolves with [response, body]
var requestPromise = Promise.promisify(request);

var putDoc = T.func([T.WebUri, T.Obj, T.Str], T.promise(T.Str))
    .of(function (dbUrl, doc, id) {
        var url     = dbUrl + '/' + id;
        var options = { method: 'PUT', json: true, uri: url, body: doc };

        // Resolve with the revision of the put doc
        return requestPromise(options).get(1).get('rev');
    });

var getUuid = T.func(T.WebUri, T.promise(T.Str))
    .of(function (couchDbUrl) {
        var url     = couchDbUrl + '/_uuids';
        var options = { method: 'GET', json: true, uri: url };

        // Resolve with the first UUID from the body of the response
        return requestPromise(options).get(1).get('uuids').get(0);
    });

module.exports = { putDoc: putDoc, getUuid: getUuid };
