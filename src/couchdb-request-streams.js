'use strict';

var Kefir   = require('kefir');
var T       = require('./pantry-types.js');
var request = require('request');

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

module.exports = { getView: getView, getChanges: getChanges, getDoc: getDoc };
