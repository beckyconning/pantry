'use strict';

var T          = require('./pantry-types');
var dbStreams  = require('./couchdb-streams');
var dbPromises = require('./couchdb-promises');
var Kefir      = require('kefir');
var _          = require('underscore');

// Check if an object's id starts with the given string
var startsWith = T.func([T.Str, T.Str], T.Bool)
    .of(function (prefix, str) { return str.indexOf(prefix) === 0; });

// Add a doc to or update a doc in the given collection
var updateCollectionWithDoc = T.func([T.Collection, T.Doc], T.Collection)
    .of(function (collection, doc) {
        var docRecord = {};
        docRecord[doc._id] = doc;
        console.log(docRecord);
        return _.extend({}, collection, docRecord);
    });

// Return a Kefir Property which represents a collection of the latest values of the `Doc`s
// in the specified database which have ids labelled with the specified label.
var contents = T.func([T.WebUri, T.Str, T.Str], T.property(T.Collection))
    .of(function (couchDbUri, dbName, docLabel) {
        var dbUri = couchDbUri + '/' + dbName;

        var initialView = dbStreams.getView(dbUri, docLabel);

        // Pluck the initial `Doc`s from initialView
        var initialDocs = initialView.pluck('rows').flatten().pluck('doc');

        // Pluck the initial update sequence from initialView and use it to start getting changed `Doc`s
        var initialUpdateSeq = initialView.pluck('update_seq');
        var changedDocs = initialUpdateSeq.flatMapLatest(dbStreams.getChangedDocs(dbUri, docLabel));
        var docs = initialDocs.merge(changedDocs);

        // Return a collection of docs which starts empty
        return docs.scan(updateCollectionWithDoc, {});
    });

var labelId = T.func([T.Str, T.Str], T.Str)
    .of(function (docLabel, uuid) { return docLabel + '-' + uuid });

// Put a doc into the specified database with a labelled id and resolve with its revision
var put = T.func([T.WebUri, T.Str, T.Str, T.Obj], T.promise(T.Str))
    .of(function (couchDbUri, dbName, docLabel, doc) {
        var dbUri = couchDbUri + '/' + dbName;

        // If its an existing doc put it otherwise give it a labelled id and then put it
        if (T.Doc.is(doc)) {
            return dbPromises.putDoc(dbUri, doc, doc._id);
        } else {
            var getLabelledId = dbPromises.getUuid(couchDbUri).then(labelId(docLabel));
            return getLabelledId.then(dbPromises.putDoc(dbUri, doc));
        }
    });

// Module export
module.exports = { contents: contents, put: put, T: T };
