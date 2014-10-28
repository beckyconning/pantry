'use strict';

// TODO: refactor tests
describe('pantry', function () {
    var proxyquire = require('proxyquire');

    var Kefir          = require('kefir');
    var Promise        = require('bluebird');
    var T              = require('tcomb');
    var objectMerge    = require('object-merge');
    var requestFake    = require('./request-fake.js');
    var passedFirstArg = require('./passed-first-arg.js');

    var requestSpy = jasmine.createSpy('request').and.callFake(requestFake);

    var pantry = proxyquire('../src/pantry', { 'request': requestSpy });

    var couchDbUrl      = 'http://example.com';
    var dbName          = 'username_public';
    var dbUrl           = couchDbUrl + '/' + dbName;
    var docLabel        = 'preserve';
    var addrNotFoundErr = new Error('getaddrinfo ENOTFOUND');

    beforeEach(function () {
        requestFake.callbacks.reset();
        requestSpy.calls.reset();
    });

    describe('contents', function () {
        var exampleUpdateSeq = 4;

        var exampleDocs = [
            { _id: 'preserve_ace2', _rev: '1-7273', name: 'Raspberry Jam',   sodium: 0.1 },
            { _id: 'preserve_rap2', _rev: '1-3851', name: 'Cranberry Sauce', sodium: 0.12 },
            { _id: 'preserve_4ab3', _rev: '1-4823', name: 'Onion Chutney',   sodium: 0.18 },
            { _id: 'preserve_4b59', _rev: '1-4823', name: 'Mango Chutney',   sodium: 0.21 }
        ];

        var exampleRows = exampleDocs.map(function (element) {
            return { doc: element };
        });
        var exampleView = { update_seq: exampleUpdateSeq, rows: exampleRows };

        var exampleChanged1stIds = ['preserve_ace2', 'preserve_4b59'];
        var irrelevantChanged1stId = 'tinned_veg_n49a';
        var exampleChanged2ndDocId = 'preserve_rap2';
        var changed3rdDocId = 'preserve_4b59';

        var changes1stResults = [
            { seq: 4, id: 'preserve_ace2',   changes: [{ rev: '2-9f9c' }] },
            { seq: 5, id: 'tinned_veg_n49a', changes: [{ rev: '4-42dc' }] },
            { seq: 6, id: 'preserve_rap2',   changes: [{ rev: '2-c90c' }], deleted: true },
            { seq: 7, id: 'preserve_4b59',   changes: [{ rev: '4-c49d' }] }
        ];
        var changes2ndResults = [{ seq: 8, id: exampleChanged2ndDocId, changes: [{ rev: '3-fa9d' }] }];
        var changes3rdResults = [{ seq: 9, id: changed3rdDocId, changes: [{ rev: '5-f8da' }] }];

        var get1stChangesBody = { last_seq: 7, results: changes1stResults };
        var get2ndChangesBody = { last_seq: 8, results: changes2ndResults };
        var get3rdChangesBody = { last_seq: 9, results: changes3rdResults };


        it('should get the current collection and update sequence straight away', function () {
            var startkeyPair    = 'startkey="' + docLabel + '_"';
            var endkeyPair      = 'endkey="' + docLabel + '_\ufff0"';
            var updateSeqPair   = 'update_seq=true';
            var includeDocsPair = 'include_docs=true';
            var keyValuePairs   = [startkeyPair, endkeyPair, updateSeqPair, includeDocsPair];
            var query           = '?' + keyValuePairs.join('&');
            var uri             = dbUrl + '/_all_docs' + query;

            var getCollectionOptions = { method: 'GET', uri: uri, json: true };

            pantry
                .contents(couchDbUrl, dbName, docLabel)
                .onValue(function () {});

            expect(requestSpy.calls.mostRecent().args[0]).toEqual(getCollectionOptions);
        });

        it('should poll for a change notification after getting the update sequence', function (done) {
            var getChangesOptions = {
                method: 'GET',
                uri: dbUrl + '/_changes?feed=longpoll&since=' + exampleUpdateSeq,
                json: true
            };

            pantry
                .contents(couchDbUrl, dbName, docLabel)
                .onValue(function () {});

            requestFake
                .callback(undefined, {}, exampleView)
                .then(function () {
                    expect(requestSpy.calls.mostRecent().args[0]).toEqual(getChangesOptions);
                    done();
                });
        });

        it('should get changed docs after first change notification', function (done) {
            var optionStructs = exampleChanged1stIds.map(function (id) {
                return { method: 'GET', uri: dbUrl + '/' + id, json: true };
            });

            pantry
                .contents(couchDbUrl, dbName, docLabel)
                .onValue(function () {});

            requestFake
                .callback(undefined, {}, exampleView)
                .then(function () { return requestFake.callback(undefined, {}, get1stChangesBody); })
                .then(function () {
                    optionStructs.forEach(function (optionStruct) {
                        expect(passedFirstArg(requestSpy, optionStruct)).toBeTruthy();
                    });
                    done();
                });
        });

        it('should not get changed docs that are not labelled with the supplied label', function (done) {
            var options =
                { method: 'GET', uri: dbUrl + '/' + irrelevantChanged1stId, json: true };

            pantry
                .contents(couchDbUrl, dbName, docLabel)
                .onValue(function () {});

            requestFake
                .callback(undefined, {}, exampleView)
                .then(function () { return requestFake.callback(undefined, {}, get1stChangesBody); })
                .then(function () {
                    expect(passedFirstArg(requestSpy, options)).toBeFalsy();
                    done();
                });
        });

        it('should poll for changes after each subsequent change notification', function (done) {
            var get2ndChangesOptions = {
                method: 'GET',
                uri: dbUrl + '/_changes?feed=longpoll&since=' + get1stChangesBody.last_seq,
                json: true
            };

            var get3rdChangesOptions = {
                method: 'GET',
                uri: dbUrl + '/_changes?feed=longpoll&since=' + get2ndChangesBody.last_seq,
                json: true
            };

            var get2ndChangedDocsOptions = {
                method: 'GET',
                uri: dbUrl + '/' + exampleChanged2ndDocId,
                json: true
            };

            var get3rdChangedDocsOptions = {
                method: 'GET',
                uri: dbUrl + '/' + changed3rdDocId,
                json: true
            };

            pantry.contents(couchDbUrl, dbName, docLabel)
                .onValue(function () {});

            // Send get collection response
            requestFake
                .callback(undefined, {}, exampleView)
                .then(function () {
                    // Send get change notification response

                    return requestFake.callback(undefined, {}, get1stChangesBody);
                })
                .then(function () {
                    // Expect second request for change notification to have been made
                    // and send second change notification response

                    expect(passedFirstArg(requestSpy, get2ndChangesOptions)).toBeTruthy();
                    return requestFake.callback(undefined, {}, get2ndChangesBody);
                })
                .then(function () {
                    // Expect a request for the changed doc document to have been made,
                    // expect third request for a change notification response to have been made
                    // and send third change notification response

                    expect(passedFirstArg(requestSpy, get2ndChangedDocsOptions)).toBeTruthy();
                    expect(passedFirstArg(requestSpy, get3rdChangesOptions)).toBeTruthy();
                    return requestFake.callback(undefined, {}, get3rdChangesBody);
                })
                .then(function () {
                    // Expect a request for the changed doc to have been made

                    expect(passedFirstArg(requestSpy, get3rdChangedDocsOptions)).toBeTruthy();
                    done();
                });
        });

        describe('returned property', function () {
            it('should have the value of an empty collection initially', function (done) {
                pantry
                    .contents(couchDbUrl, dbName, docLabel)
                    .onValue(function (value) {
                        expect(value).toEqual({});
                        done();
                    });
            });

            it('should have the value of the current collection after it has been retreived', function (done) {
                var collection  = {
                    preserve_ace2: exampleDocs[0],
                    preserve_rap2: exampleDocs[1],
                    preserve_4ab3: exampleDocs[2],
                    preserve_4b59: exampleDocs[3]
                };
                var lastValue;

                pantry
                    .contents(couchDbUrl, dbName, docLabel)
                    .onValue(function (value) { lastValue = value; });

                requestFake
                    .callback(undefined, {}, exampleView)
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
        var firstRevision         = '1-967a';
        var secondRevision        = '2-28rb';
        var newUuid               = '6e12';
        var existingUuid          = '0992';

        var newLabelledId         = docLabel + '_' + newUuid;
        var existingLabelledId    = docLabel + '_' + existingUuid;

        var blankExistingDoc      = { _id: existingLabelledId, _rev: firstRevision };
        var newDoc                = { name: 'Strabwerry Jam', sodum: 2 };
        var existingDoc           = objectMerge(newDoc, blankExistingDoc);

        var uuidResponseBody      = { "uuids": [newUuid] };
        var putNewDocResponseBody = { ok: true, id: newLabelledId, rev: firstRevision  };
        var putDocResponseBody    = { ok: true, id: newLabelledId, rev: secondRevision };

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

            requestFake
                .callback(null, {}, uuidResponseBody)
                .then(function () {
                    expect(requestSpy.calls.mostRecent().args[0]).toEqual(putDocOptions);
                    done();
                });
        });

        it('should put with the doc id when supplied', function () {
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
            it('should resolve with struct containing id and revision when put existing doc succeeds', function (done) {
                var PutResponseBody = T.struct({ ok: T.Bool, id: T.Str, rev: T.Str });

                pantry
                    .put(couchDbUrl, dbName, docLabel, existingDoc)
                    .then(function (body) {
                        PutResponseBody(body);
                        done();
                    });

                requestFake.callback(undefined, {}, putDocResponseBody);
            });

            it('should resolve with struct containing id and revision when putting new doc succeeds', function (done) {
                var PutResponseBody = T.struct({ ok: T.Bool, id: T.Str, rev: T.Str });

                pantry
                    .put(couchDbUrl, dbName, docLabel, newDoc)
                    .then(function (body) {
                        PutResponseBody(body);
                        done();
                    });

                requestFake
                    .callback(undefined, {}, uuidResponseBody)
                    .then(function () {
                        return requestFake.callback(undefined, {}, putNewDocResponseBody);
                    });
            });

            it('should be rejected when putting existing doc fails', function (done) {
                pantry
                    .put(couchDbUrl, dbName, docLabel, existingDoc)
                    .catch(function () {
                        done();
                    });

                requestFake.callback(addrNotFoundErr, {}, undefined);
            });

            it('should be rejected when getting uuid fails', function (done) {
                pantry
                    .put(couchDbUrl, dbName, docLabel, newDoc)
                    .catch(function () {
                        done();
                    });

                requestFake.callback(addrNotFoundErr, {}, undefined);
            });

            it('should be rejected when putting new doc fails', function (done) {
                pantry
                    .put(couchDbUrl, dbName, docLabel, newDoc)
                    .catch(function () {
                        done();
                    });

                requestFake
                    .callback(undefined, {}, uuidResponseBody)
                    .then(function () {
                        return requestFake.callback(addrNotFoundErr, {}, undefined);
                    });
            });

        });
    });
});
