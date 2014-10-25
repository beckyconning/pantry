'use strict';

describe('pantry', function () {
    var proxyquire = require('proxyquire');

    var Kefir       = require('kefir');
    var Promise     = require('bluebird');
    var T           = require('tcomb');
    var objectMerge = require('object-merge');

    var requestFake = function requestFake(options, callback) {
        requestFake.flush = function (error, response, body) {
            // return promise that is resolved after callback has been called
            return new Promise(function (resolve) {
                callback(error, response, body);
                // resolve after timeout to ensure sync
                setTimeout(resolve, 0);
            });
        };
    };

    var requestSpy = jasmine.createSpy('request').and.callFake(requestFake);

    var pantry = proxyquire('../src/pantry', { 'request': requestSpy });

    var couchDbUrl            = 'http://example.com';
    var dbName                = 'username_public';
    var dbUrl                 = couchDbUrl + '/' + dbName;

    var docLabel              = 'preserve';
    var firstRevision         = '1-967a';
    var newUuid               = '6e12';
    var existingUuid          = '0992';
    var newLabelledId         = docLabel + '_' + newUuid;
    var existingLabelledId    = docLabel + '_' + existingUuid;

    var blankExistingDoc      = { _id: existingLabelledId, _rev: firstRevision };
    var newDoc                = { name: 'Strabwerry Jam', sodum: 2 };
    var existingDoc           = objectMerge(newDoc, blankExistingDoc);

    var addrNotFoundErr       = new Error('getaddrinfo ENOTFOUND');

    var uuidResponseBody      = { "uuids": [newUuid] };
    var putNewDocResponseBody = { ok: true, id: newLabelledId, rev: firstRevision };

    var collection  = [
        { _id: 'preserve_ace2', _rev: '1-7273', name: 'Raspberry Jam', sodium: 0.1 },
        { _id: 'preserve_rap2', _rev: '1-3851', name: 'Cranberry Sauce', sodium: 0.12 },
        { _id: 'preserve_4ab3', _rev: '1-4823', name: 'Onion Chutney', sodum: 0.18 }
    ];
    var collectionRows = collection.map(function (element) {
        return { doc: element };
    });
    var getCollectionBody = { update_seq: 3, rows: collectionRows };

    beforeEach(function () {
        requestSpy.calls.reset();
    });

    describe('contents', function () {
        it('should get the current collection and update sequence straight away', function () {
            var startkeyQuery = 'startkey="' + docLabel + '_"';
            var endkeyQuery = 'endkey="' + docLabel + '_\ufff0"';
            var updateSeqQuery = 'update_seq=true';
            var includeDocsQuery = 'include_docs=true';
            var getCollectionQuery = '?'
                + [startkeyQuery, endkeyQuery, updateSeqQuery, includeDocsQuery].join('&');

            var getCollectionOptions = {
                method: 'GET',
                uri:    dbUrl + '/_all_docs' + getCollectionQuery,
                json:   true
            };

            pantry.contents(couchDbUrl, dbName, docLabel)
                .onValue(function () {} );

            expect(requestSpy.calls.mostRecent().args[0]).toEqual(getCollectionOptions);
        });

        describe('returned property', function () {
            it('should have the value of an empty collection initially', function (done) {
                pantry.contents(couchDbUrl, dbName, docLabel)
                    .onValue(function (value) {
                        expect(value).toEqual([]);
                        done();
                    });
            });

            it('should have the value of the current collection after it has been retreived', function (done) {
                var lastValue;

                pantry.contents(couchDbUrl, dbName, docLabel)
                    .onValue(function (value) { lastValue = value; });

                requestFake.flush(undefined, {}, getCollectionBody)
                    .then(function () {
                        expect(lastValue).toEqual(collection);
                        done();
                    });
            });

            it('should have the value of the updated collection after an update has been retrieved', function () {
                pending();
            });

            it('should have the value of the updated collection after n updates have been retrieved', function () {
                pending();
            });

            it('should end when an http get fails', function () {
                pending();
            });
        });
    });

    describe('put', function () {
        it('should get a uuid from couchdb when no id supplied', function () {
            // Expect `put` to go get a uuid from CouchDB
            var getUuidOptions = {
                method: 'GET',
                uri:    couchDbUrl + '/_uuids',
                json:   true
            };

            pantry.put(couchDbUrl, dbName, docLabel, newDoc);

            expect(requestSpy.calls.mostRecent().args[0]).toEqual(getUuidOptions);
        });

        it('should label the uuid and put with it as an id when no id supplied', function (done) {
            var putDocOptions = {
                method: 'PUT',
                uri:    dbUrl + '/' + newLabelledId,
                json:   true,
                body:   newDoc
            };

            pantry.put(couchDbUrl, dbName, docLabel, newDoc);

            requestFake.flush(null, {}, uuidResponseBody)
                .then(function () {
                    expect(requestSpy.calls.mostRecent().args[0]).toEqual(putDocOptions);
                    done();
                });
        });

        it('should put with the document id when supplied', function () {
            var putDocOptions = {
                method: 'PUT',
                uri:    dbUrl + '/' + existingDoc._id,
                json:   true,
                body:   existingDoc
            };

            pantry.put(couchDbUrl, dbName, docLabel, existingDoc);

            expect(requestSpy.calls.mostRecent().args[0]).toEqual(putDocOptions);
        });

        describe('returned promise', function () {
            it('should be rejected when the http put fails', function (done) {
                pantry.put(couchDbUrl, dbName, docLabel, existingDoc)
                    .catch(function () {
                        done();
                    });

                requestFake.flush(addrNotFoundErr, {}, undefined);
            });

            it('should resolve with a struct containing id and revision when the http put succeeds', function (done) {
                pantry.put(couchDbUrl, dbName, docLabel, existingDoc)
                    .then(function (body) {
                        expect(T.Obj.is(body)).toBeTruthy();
                        done();
                    });

                requestFake.flush(undefined, {}, putNewDocResponseBody);
            });
        });
    });
});
