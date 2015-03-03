'use strict';

// TODO: write tests for request fails

var Kefir   = require('kefir');
var T       = require('./pantry-types.js');
var request = require('request');

var successfulHttpStatusCode = T.func(T.Num, T.Bool)
    .of(function(httpStatusCode) {
        return Math.floor(httpStatusCode / 100) === 2;
    });

var throwIfUnsuccessfulResponse = T.func([T.Response, T.Any], T.Response)
    .of(function(response, body) {
        if (successfulHttpStatusCode(response.statusCode)) { return response; }
        else { throw new Error('HTTP Error:' + body); }
    });

var getUuid = T.func(T.WebUri, T.stream(T.Str))
    .of(function (couchDbUri) {
        var url     = couchDbUri + '/_uuids';
        var options = { method: 'GET', json: true, uri: url };

        var requestUuid = function (callback) { request(options, callback); };

        return Kefir.fromNodeCallback(requestUuid).pluck('body').pluck('uuids').flatten();
    });

var putDoc = T.func([T.WebUri, T.Obj, T.Str], T.stream(T.Str))
    .of(function (dbUri, doc, id) {
        var url     = dbUri + '/' + id;
        var options = { method: 'PUT', json: true, uri: url, body: doc };

        var requestDoc = function (callback) { request(options, callback); };

        return Kefir.fromNodeCallback(requestDoc).pluck('body').pluck('rev');
    });

// Get the view from the database (contains rows for collection and update sequence)
var getView = T.func([T.WebUri, T.Str], T.stream(T.View))
    .of(function (dbUri, docLabel) {
        var startkeyPair    = 'startkey="' + docLabel + '-"';
        var endkeyPair      = 'endkey="' + docLabel + '-\ufff0"';
        var updateSeqPair   = 'update_seq=true';
        var includeDocsPair = 'include_docs=true';
        var keyValuePairs   = [startkeyPair, endkeyPair, updateSeqPair, includeDocsPair];
        var query           = '?' + keyValuePairs.join('&');
        var uri             = dbUri + '/_all_docs' + query;
        var options         = { method: 'GET', json: true, uri: uri };
        var requestView     = function (callback) { request(options, callback) };

        return Kefir.fromNodeCallback(requestView).pluck('body');
    });

// Long poll sequentially for change notifications from the database
var getNotifications = T.func([T.WebUri, T.Num], T.stream(T.Notification))
    .of(function (dbUri, updateSeq) {
        var uri                 = dbUri + '/_changes?feed=longpoll&since=' + updateSeq;
        var options             = { method: 'GET', json: true, uri: uri };
        var requestNotification = function (callback) { request(options, callback) };
        var notification        = Kefir.fromNodeCallback(requestNotification).pluck('body');
        var updateSeq           = notification.pluck('last_seq');
        var nextNotification    = updateSeq.flatMapLatest(getNotifications(dbUri));

        return notification.merge(nextNotification);
    });

// Get a `Doc` from the database
var getDoc = T.func([T.WebUri, T.Str, T.Str], T.stream(T.Doc))
    .of(function (dbUri, id, rev) {
        var uri        = dbUri + '/' + id + '?rev=' + rev;
        var options    = { method: 'GET', json: true, uri: uri };
        var requestDoc = function (callback) { request(options, callback) };

        return Kefir.fromNodeCallback(requestDoc).pluck('body');
    });

// Wrapper for getDoc that uses a `Result`
var getDocFromResult = T.func([T.WebUri, T.Result], T.stream(T.Doc))
    .of(function (dbUri, result) {
        // This doesn't deal with revision conflicts
        return getDoc(dbUri, result.id, result.changes[0].rev);
    });

// Check if an `Str` starts with another
var startsWith = T.func([T.Str, T.Str], T.Bool)
    .of(function (prefix, str) {
        return str.indexOf(prefix) === 0;
    });

// Get `Result`s relating to to `Doc`s which are labelled with the provided label
var getResults = T.func([T.WebUri, T.Str, T.Num], T.stream(T.Result))
    .of(function (dbUri, docLabel, updateSeq) {
        var notifications     = getNotifications(dbUri, updateSeq);
        var results           = notifications.pluck('results').flatten();
        var resultRelevancies = results.pluck('id').map(startsWith(docLabel));
        return results.filterBy(resultRelevancies);
    });

// Get the `Docs`s which are labelled with the provided label that have changed
var getChangedDocs = T.func([T.WebUri, T.Str, T.Num], T.stream(T.Doc))
    .of(function (dbUri, docLabel, updateSeq) {
        var resultsWithLabel = getResults(dbUri, docLabel, updateSeq);
        return resultsWithLabel.flatMap(getDocFromResult(dbUri));
    });

module.exports = { getView: getView, getDoc: getDoc, getChangedDocs: getChangedDocs, getUuid: getUuid, putDoc: putDoc };
