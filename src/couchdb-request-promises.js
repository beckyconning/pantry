'use strict';

var Promise = require('bluebird');
var T       = require('./pantry-types.js');
var request = require('request');

var requestPromise = Promise.promisify(request);

var putDoc = T.func([T.Url, T.Obj, T.Str], T.Promise)
    .of(function (dbUrl, doc, id) {
        var url     = dbUrl + '/' + id;
        var options = { method: 'PUT', json: true, uri: url, body: doc };

        // Return the body of the response
        return requestPromise(options).get(1);
    });

var getUuid = T.func(T.Url, T.Promise)
    .of(function (couchDbUrl) {
        var url     = couchDbUrl + '/_uuids';
        var options = { method: 'GET', json: true, uri: url };

        // Return the first UUID from the body of the response
        return requestPromise(options).get(1).get('uuids').get(0);
    });

module.exports = { putDoc: putDoc, getUuid: getUuid };
