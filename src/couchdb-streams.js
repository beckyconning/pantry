'use strict';

// TODO: write tests for request fails

var Kefir   = require('kefir');
var T       = require('./pantry-types.js');
var request = require('request');

// Wrapper for `request` that calls the provided callback with the resulting body
var requestBody = function (options, callback) {
    request(options, function (error, response, body) {
        callback(body);
    });
};

// Get the view from the database (contains rows for collection and update sequence)
var getView = T.func([T.Url, T.Str], T.stream(T.View))
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

// Long poll sequentially for change notifications from the database
var getNotifications = T.func([T.Url, T.Num], T.stream(T.Notification))
    .of(function (dbUrl, updateSeq) {
        var uri              = dbUrl + '/_changes?feed=longpoll&since=' + updateSeq;
        var options          = { method: 'GET', json: true, uri: uri };
        var notification     = Kefir.fromCallback([requestBody, null, options]);
        var updateSeq        = changeNotification.pluck('last_seq')
        var nextNotification = updateSeq.flatMapLatest(getChangeNotifications(dbUrl, docLabel));

        return notification.merge(nextNotification)
    });

// Get a `Doc` from the database
var getDoc = T.func([T.Url, T.Str, T.Str], T.stream(T.Doc))
    .of(function (dbUrl, id, rev) {
        var uri     = dbUrl + '/' + id + '?rev=' + rev;
        var options = { method: 'GET', json: true, uri: uri };

        return Kefir.fromCallback([requestBody, null, options]);
    });

// Wrapper for getDoc that uses a `Result`
var getDocFromResult = T.func([T.Url, T.Result], T.stream(T.Doc))
    .of(function (dbUrl, result) {
        return getDoc(dbUrl, result.id, result.changes[0].rev);
    });

// Check if an `Str` starts with another
var startsWith = T.func([T.Str, T.Str], T.Bool)
    .of(function (prefix, str) {
        return str.indexOf(prefix) === 0;
    });

// Get `Result`s relating to to `Doc`s which are labelled with the provided label
var getResults = T.func([T.Url, T.Str, T.Num], T.stream(T.Doc))
    .of(function (dbUrl, docLabel, updateSeq) {
        var notifications     = getNotifications(dbUrl, updateSeq);
        var results           = notifications.pluck('results');
        var resultRelevancies = results.pluck('id').map(startsWith(docLabel));
        return results.filterBy(resultRelevancies);
    });

// Get the `Docs`s which are labelled with the provided label that have changed
var getChangedDocs = T.func([T.Url, T.Str, T.Num], T.stream(T.Doc))
    .of(function (dbUrl, docLabel, updateSeq) {
        var resultsWithLabel = getResultsWithLabel(dbUrl, docLabel, updateSeq);
        return resultsWithLabel.flatMap(getDocFromResult(dbUrl));
    });

module.exports = { getView: getView, getChangedDocs: getChangedDocs };
