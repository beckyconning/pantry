'use strict';

describe('pantry', function () {
    var Kefir       = require('kefir');
    var Promise     = require('bluebird');
    var T           = require('tcomb');
    var proxyquire  = require('proxyquire');
    var objectMerge = require('object-merge');

    var requestFake = function requestFake(options, callback) {
        requestFake.flush = function (error, response, body) {
            return new Promise(function (resolve) {
                callback(error, response, body);
                setTimeout(resolve, 0);
            });
        };
    };

    var requestSpy = jasmine.createSpy('request').and.callFake(requestFake);

    var pantry = proxyquire('../src/pantry', { 'request': requestSpy });

    var couchDbUrl            = 'http://example.com';
    var dbName                = '2Kt06t295mj7AEcTlruU93M53Ekpd5mx';
    var dbUrl                 = couchDbUrl + '/' + dbName;

    var docLabel              = 'preserve';
    var firstRevision         = '1-967a00dff5e02add41819138abb3284d';
    var newUuid               = '6e1295ed6c29495e54cc05947f18c8af';
    var existingUuid          = '0992c54b79c5f8c603947c67a00002d2';
    var newLabelledId         = docLabel + '_' + newUuid;
    var existingLabelledId    = docLabel + '_' + existingUuid;

    var blankExistingDoc      = { _id: existingLabelledId, _rev: firstRevision };
    var newDoc                = { name: 'Strabwerry Jam', sodum: 2 };
    var existingDoc           = objectMerge(newDoc, blankExistingDoc);

    var addrNotFoundErr       = new Error('getaddrinfo ENOTFOUND');

    var uuidResponseBody      = { "uuids": [newUuid] };
    var putNewDocResponseBody = { ok: true, id: newLabelledId, rev: firstRevision };

    beforeEach(function () {
        requestSpy.calls.reset();
    });

    describe('contents', function () {
        it('should get the current collection and update sequence straight away', function () {
            pending();
        });

        describe('returned property', function () {
            it('should have the value of an empty collection initially', function () {
                pending();
            });

            it('should have the value of the current collection after it has been retreived', function () {
                pending();
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
            pantry.put(couchDbUrl, dbName, docLabel, newDoc);

            // Expect `put` to go get a uuid from CouchDB
            var getUuidOptions = {
                method: 'GET',
                uri:    couchDbUrl + '/_uuids',
                json:   true
            };
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
            pantry.put(couchDbUrl, dbName, docLabel, existingDoc);

            var putDocOptions = {
                method: 'PUT',
                uri:    dbUrl + '/' + existingDoc._id,
                json:   true,
                body:   existingDoc
            };

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
