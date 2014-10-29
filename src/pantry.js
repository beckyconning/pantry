'use strict';

var T          = require('./pantry-types.js');
var dbStreams  = require('./couchdb-request-streams.js');
var dbPromises = require('./couchdb-request-promises.js');

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
// in the specified database which have ids labelled with the specified label.
var contents = T.func([T.Url, T.Str, T.Str], T.Property)
    .of(function (couchDbUrl, dbName, docLabel) {
        var dbUrl       = couchDbUrl + '/' + dbName;
        var initialView = dbStreams.getView(dbUrl, docLabel);

        // Pluck the initial docs from initialView
        var initialDocs = initialView.pluck('rows').flatten().pluck('doc');

        // Pluck the initial update sequence from initialView and use it to start getting changes
        var initialUpdateSeq = initialView.pluck('update_seq');
        var changes = initialUpdateSeq.flatMapLatest(dbStreams.getChanges(dbUrl, docLabel));

        // Pluck the changed docs from changes and filter out the ones without the right label
        var changedDocIds         = changes.pluck('results').flatten().pluck('id');
        var relevantChangedDocIds = changedDocIds.filter(startsWith(docLabel));
        var relevantChangedDocs   = relevantChangedDocIds.flatMap(dbStreams.getDoc(dbUrl));

        // Merge the initial docs and any relevant docs that were changed after
        var docs = initialDocs.merge(relevantChangedDocs)

        // Return a collection of docs which starts empty
        return docs.scan({}, updateCollectionWithDoc);
    });

var labelId = T.func([T.Str, T.Str], T.Str)
    .of(function (docLabel, uuid) { return docLabel + '_' + uuid });

// Put a doc into the specified database with a labelled id
var put = T.func([T.Url, T.Str, T.Str, T.Obj], T.Promise)
    .of(function (couchDbUrl, dbName, docLabel, doc) {
        var dbUrl = couchDbUrl + '/' + dbName;

        if (T.ExistingDoc.is(doc)) {
            return dbPromises.putDoc(dbUrl, doc, doc._id);
        } else {
            var getLabelledId = dbPromises.getUuid(couchDbUrl).then(labelId(docLabel));
            return getLabelledId.then(dbPromises.putDoc(dbUrl, doc));
        }
    });

// Module export
module.exports = { contents: contents, put: put };
