'use strict';

describe('pantry', function () {
    var proxyquire         = require('proxyquire');
    var Kefir              = require('kefir');
    var Promise            = require('bluebird');
    var T                  = require('tcomb');

    var passedFirstArg     = require('./passed-first-arg');
    var dbStreamsData      = require('./db-streams-fake-data');

    var couchDbUrl         = 'http://example.com';
    var dbName             = 'username_public';
    var dbUrl              = couchDbUrl + '/' + dbName;
    var docLabel           = 'preserve';

    // Overide types that use `instanceof` as proxyquire can create duplicate contructors
    var typesMock          = { Property: T.Obj, Stream: T.Obj, Promise: T.Obj };
    var dbStreamsSpy       = require('./db-streams-spy');
    var mocks              = { './pantry-types': typesMock, './couchdb-streams': dbStreamsSpy };
    var pantry             = proxyquire('../src/pantry', mocks);

    beforeEach(function () {
        dbStreamsSpy.initEmitters();
    });

    describe('contents', function () {
        var contents;

        beforeEach(function () {
            contents = pantry.contents(couchDbUrl, dbName, docLabel).onValue(function () {});
        });

        it('should get the initial collection and update sequence straight away', function () {
            expect(dbStreamsSpy.getViewSpy).toHaveBeenCalledWith(dbUrl, docLabel);
        });

        it('should start getting changed docs after getting the update sequence', function (done) {
            console.log();
            dbStreamsSpy.viewEmitter.onValue(function (view) {
                var updateSeq = view['update_seq'];
                var expectedArgs = [dbUrl, docLabel, updateSeq];
                expect(dbStreamsSpy.getChangedDocsSpy.calls.mostRecent().args).toEqual(expectedArgs);
                done();
            });

            dbStreamsSpy.viewEmitter.emit(dbStreamsData.initialView);
        });

        describe('returned property', function () {
            it('should have the value of an empty collection initially', function (done) {
                pantry.contents(couchDbUrl, dbName, docLabel).onValue(function (value) {
                    expect(value).toEqual({});
                    done();
                });
            });

            it('should have the value of the initial collection after it has been retreived', function (done) {
                var initialCollection = {};
                dbStreamsData.initialDocs.forEach(function (doc) {
                    initialCollection[doc._id] = doc;
                });

                contents.skip(1).onValue(function (value) {
                    expect(value).toEqual(initialCollection);
                    done();
                });

                dbStreamsSpy.viewEmitter.emit(dbStreamsData.initialView);
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
                pending();
        });

        it('should label the uuid and put with it as an id when no id supplied', function (done) {
                pending();
        });

        it('should put with the doc id when supplied', function () {
                pending();
        });

        describe('returned promise', function () {
            it('should resolve with struct containing id and revision when put existing doc succeeds', function (done) {
                pending();
            });

            it('should resolve with struct containing id and revision when putting new doc succeeds', function (done) {
                pending();
            });

            it('should be rejected when putting existing doc fails', function (done) {
                pending();
            });

            it('should be rejected when getting uuid fails', function (done) {
                pending();
            });

            it('should be rejected when putting new doc fails', function (done) {
                pending();
            });

        });
    });
});
