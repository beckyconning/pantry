describe('pantry', function () {
    var Kefir    = require('kefir');
    var T        = require('tcomb');
    var _        = require('underscore');
    var pantry   = require('../src/pantry');
    var couchUrl = "http://example.com";
    var docType  = "delicious-food";

    beforeEach(function () {
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
        describe('returned stream', function () {
            it('should end with an error when the http put fails', function () {
                pending();
            });

            it('should end with a struct containing id and revision when the http put succeeds', function () {
                pending();
            });
        });
    });
});
