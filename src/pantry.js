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

// Return a Kefir Property which represents a collection of the latest values of the docs
// in the specified database which have ids labelled with the specifified label.
var contents = T.func([T.Url, T.Str, T.Str], T.Property)
    .of(function (couchDbUrl, dbName, docLabel) {
        var dbUrl = couchDbUrl + '/' + dbName;

        // Get the view from the database (contains rows for collection and update sequence)
        var getView = T.func([], T.Stream)
            .of(function () {
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
        var getChanges = T.func(T.Num, T.Stream)
            .of(function getChanges(updateSeq) {
                var uri               = dbUrl + '/_changes?feed=longpoll&since=' + updateSeq;
                var options           = { method: 'GET', json: true, uri: uri };
                var firstChanges      = Kefir.fromCallback([requestBody, null, options]);
                var subsequentChanges = firstChanges.pluck('last_seq').flatMapLatest(getChanges);

                return firstChanges.merge(subsequentChanges);
            });

        // Get a doc from the database
        var getDoc = T.func(T.Str, T.Stream)
            .of(function (docId) {
                var uri     = dbUrl + '/' + docId;
                var options = { method: 'GET', json: true, uri: uri };

                return Kefir.fromCallback([requestBody, null, options]);
            });

        // Add a doc to or update a doc in provided collection
        var updateCollectionWithDoc = T.func([T.Collection, T.Doc], T.Collection)
            .of(function (collection, doc) {
                collection[doc._id] = doc;
                return collection;
            });

        var idStartsWithDocLabel = T.func(T.struct({ id: T.Str }), T.Bool)
            .of(function (result) {
                return result.id.indexOf(docLabel) === 0;
            });

        var initialView = getView();

        // Pluck the initial docs from initialView
        var initialDocs = initialView
            .pluck('rows')
            .transform()
            .pluck('doc');

        // Pluck the initial update sequence from initialView and use it to start getting changes
        var changes = initialView
            .pluck('update_seq')
            .flatMapLatest(getChanges);

        // Pluck the changed docs from changes and filter out the ones without the right label
        var changedDocs = changes
            .pluck('results')
            .transform()
            .filter(idStartsWithDocLabel)
            .pluck('id')
            .flatMap(getDoc);

        // Merge the initial docs and any docs that were changed after and put them
        // into a collection that starts off empty
        return initialDocs
            .merge(changedDocs)
            .scan({}, updateCollectionWithDoc);
    });

// Put a doc into the database with a labelled id
var put = T.func([T.Url, T.Str, T.Str, T.Obj], T.Promise)
    .of(function (couchDbUrl, dbName, docLabel, doc) {
        var dbUrl   = couchDbUrl + '/' + dbName;
        var uuidUrl = couchDbUrl + '/_uuids';

        var getUuidOptions = { method: 'GET', json: true, uri: uuidUrl };
        var putDocOptions  = { method: 'PUT', json: true, body: doc };

        var existingDocUrl        = dbUrl + '/' + doc._id;
        var existingDocUrlObject  = { uri: existingDocUrl };
        var putExistingDocOptions = objectMerge(putDocOptions, existingDocUrlObject);

        var labelAndPutDoc = T.func(T.Str, T.Promise)
            .of(function (uuid) {
                var labelledId       = docLabel + '_' + uuid
                var newDocUrl        = dbUrl + '/' + labelledId;
                var newDocUrlObject  = { uri: newDocUrl };
                var putNewDocOptions = objectMerge(putDocOptions, newDocUrlObject);

                return requestPromise(putNewDocOptions);
            });

        // If the doc has an id then put it otherwise get it an id, label it and put it
        if (T.Str.is(doc._id)) {
            // Put the doc and resolve with the body from the response
            return requestPromise(putExistingDocOptions).get(1);
        } else {
            // Get an id for the doc, label the id and put the doc with the labelled id
            return requestPromise(getUuidOptions)
                .get(1)
                .get('uuids')
                .get(0)
                .then(labelAndPutDoc)
                .get(1);
        }
    });

// Module export
module.exports = { contents: contents, put: put };
