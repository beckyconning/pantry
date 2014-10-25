'use strict';

var Kefir          = require('kefir');
var Promise        = require('bluebird');
var T              = require('tcomb');
var request        = require('request');
var validUrl       = require('valid-url');
var objectMerge    = require('object-merge');

var requestPromise = Promise.promisify(request);
var requestBody = function (options, callback) {
    request(options, function (error, response, body) {
        callback(body);
    });
};

T.Property = T.subtype(T.Obj, function (obj) {
    return obj instanceof Kefir.Property;
}, 'Property');

T.Promise = T.subtype(T.Obj, function (obj) {
    return obj instanceof Promise;
}, 'Promise');

T.Url = T.subtype(T.Str, function (str) {
    return validUrl.isWebUri(str);
}, 'Url');

var Contents = T.func([T.Url, T.Str, T.Str], T.Property);
var Put      = T.func([T.Url, T.Str, T.Str, T.Obj], T.Promise);
var Pantry   = T.struct({ contents: Contents, put: Put });

var contents = Contents.of(function (couchDbUrl, dbName, docLabel) {
    var dbUrl                = couchDbUrl + '/' + dbName;
    var startkeyQuery        = 'startkey="' + docLabel + '_"';
    var endkeyQuery          = 'endkey="' + docLabel + '_\ufff0"';
    var updateSeqQuery       = 'update_seq=true';
    var includeDocsQuery     = 'include_docs=true';
    var getCollectionQuery   = '?' +
        [startkeyQuery, endkeyQuery, updateSeqQuery, includeDocsQuery].join('&');
    var uri                  = dbUrl + '/_all_docs' + getCollectionQuery;
    var getCollectionOptions = { method: 'GET', uri: uri, json: true };

    var getCollection = function () {
        return Kefir.fromCallback([requestBody, null, getCollectionOptions])
    };

    var emptyCollection = Kefir.constant([]);
    var initialCollection = emptyCollection.flatMapLatest(getCollection)
        .pluck('rows')
        .map(function (rows) { return rows.map(function (row) { return row.doc; }) });

    return emptyCollection.merge(initialCollection)
        .toProperty();
});

var put = Put.of(function (couchDbUrl, dbName, docLabel, doc) {
    var dbUrl = couchDbUrl + '/' + dbName;
    var uuidUrl = couchDbUrl + '/_uuids';

    var getUuidOptions = { method: 'GET', uri: uuidUrl, json: true };
    var putDocOptions  = { method: 'PUT', json: true, body: doc };

    var existingDocUrl = dbUrl + '/' + doc._id;
    var existingDocUrlObject = { uri: existingDocUrl };
    var putExistingDocOptions = objectMerge(putDocOptions, existingDocUrlObject);

    var putDocFromUuid = T.func(T.Str, T.Promise)
        .of(function (uuid) {
            var labelledId       = docLabel + '_' + uuid
             var newDocUrl        = dbUrl + '/' + labelledId;
             var newDocUrlObject  = { uri: newDocUrl };
            var putNewDocOptions = objectMerge(putDocOptions, newDocUrlObject);

            return requestPromise(putNewDocOptions);
        });

    if (T.Str.is(doc._id)) {
        return requestPromise(putExistingDocOptions)
            .get(1);
    } else {
        return requestPromise(getUuidOptions)
            .get(1)
            .get('uuids')
            .get(0)
            .then(putDocFromUuid);
    }
});

module.exports = Pantry({ contents: contents, put: put });
