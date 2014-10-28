'use strict';

var Kefir       = require('kefir');
var Promise     = require('bluebird');
var T           = require('./pantry-types.js');
var request     = require('request');
var objectMerge = require('object-merge');

// Request helpers
var requestPromise = Promise.promisify(request);
var requestBody = function (options, callback) {
    request(options, function (error, response, body) {
        callback(body);
    });
};

// Get the view from the database (contains rows for collection and update sequence)
var getView = T.func([T.Url, T.Str], T.Stream)
    .of(function (dbUrl, docLabel) {
        var startkeyPair    = 'startkey="' + docLabel + '_"';
        var endkeyPair      = 'endkey="' + docLabel + '_\ufff0"';
        var updateSeqPair   = 'update_seq=true';
        var includeDocsPair = 'include_docs=true';
        var keyValuePairs   = [startkeyPair, endkeyPair, updateSeqPair, includeDocsPair];
        var query           = '?' + keyValuePairs.join('&');
        var uri             = dbUrl + '/_all_docs' + query;
        var options         = { method: 'GET', json: true, uri: uri };

        return Kefir.fromCallback([requestBody, null, options])
    });

// Long poll continuously for change notifications from the database
var getChanges = T.func([T.Url, T.Str, T.Num], T.Stream)
    .of(function (dbUrl, docLabel, updateSeq) {
        var uri               = dbUrl + '/_changes?feed=longpoll&since=' + updateSeq;
        var options           = { method: 'GET', json: true, uri: uri };
        var firstChanges      = Kefir.fromCallback([requestBody, null, options]);
        var updateSeqs        = firstChanges.pluck('last_seq')
        var subsequentChanges = updateSeqs.flatMapLatest(getChanges(dbUrl, docLabel));

        return firstChanges.merge(subsequentChanges);
    });

// Get a doc from the database
var getDoc = T.func([T.Url, T.Str], T.Stream)
    .of(function (dbUrl, docId) {
        var uri     = dbUrl + '/' + docId;
        var options = { method: 'GET', json: true, uri: uri };

        return Kefir.fromCallback([requestBody, null, options]);
    });

// Check if an object's id starts with the given string
var startsWith = T.func([T.Str, T.Str], T.Bool)
    .of(function (prefix, str) { return str.indexOf(prefix) === 0; });

// Add a doc to or update a doc in the given collection
var updateCollectionWithDoc = T.func([T.Collection, T.ExistingDoc], T.Collection)
    .of(function (collection, doc) {
        collection[doc._id] = doc;
        return collection;
    });

// Return a Kefir Property which represents a collection of the latest values of the docs
// in the specified database which have ids labelled with the specifified label.
var contents = T.func([T.Url, T.Str, T.Str], T.Property)
    .of(function (couchDbUrl, dbName, docLabel) {
        var dbUrl       = couchDbUrl + '/' + dbName;
        var initialView = getView(dbUrl, docLabel);

        // Pluck the initial docs from initialView
        var initialDocs = initialView.pluck('rows').transform().pluck('doc');

        // Pluck the initial update sequence from initialView and use it to start getting changes
        var changes = initialView.pluck('update_seq').flatMapLatest(getChanges(dbUrl, docLabel));

        // Pluck the changed docs from changes and filter out the ones without the right label
        var changedDocIds         = changes.pluck('results').transform().pluck('id');
        var relevantChangedDocIds = changedDocIds.filter(startsWith(docLabel));
        var relevantChangedDocs   = changedDocIds.flatMap(getDoc(dbUrl));

        // Merge the initial docs and any relevant docs that were changed after
        var docs = initialDocs.merge(relevantChangedDocs)

        // Return a collection of docs which starts empty
        return docs.scan({}, updateCollectionWithDoc);
    });

var labelId = T.func([T.Str, T.Str], T.Str)
    .of(function (docLabel, uuid) { return docLabel + '_' + uuid });

var putDocWithId = T.func([T.Url, T.Obj, T.Str], T.Promise)
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

// Put a doc into the specified database with a labelled id
var put = T.func([T.Url, T.Str, T.Str, T.Obj], T.Promise)
    .of(function (couchDbUrl, dbName, docLabel, doc) {
        var dbUrl = couchDbUrl + '/' + dbName;

        if (T.ExistingDoc.is(doc)) {
            return putDocWithId(dbUrl, doc, doc._id);
        } else {
            var getLabelledId = getUuid(couchDbUrl).then(labelId(docLabel));
            return getLabelledId.then(putDocWithId(dbUrl, doc));
        }
    });

// Module export
module.exports = { contents: contents, put: put };
