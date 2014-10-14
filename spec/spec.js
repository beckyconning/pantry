describe('Pantry', function () {
    var Promise = require('bluebird');
    var Pantry = require('../index.js');
    var _ = require('underscore');
    var couchUrl = "http://example.com";

    beforeEach(function () {
    });

    it('should apply tcomb function types to provided http get / put functions', function () {

    });

    describe('contents', function () {
        it('should return a Kefir property');

        it('should only call http get / put functions safely');

        it('should get the current collection and update sequence straight away');

        it('should get

        describe('returned property', function () {
            it('should have the value of an empty collection initially');

            it('should have the value of the current collection after it has been retreived');

            it('should have the value of the updated collection after an update has been retrieved');

            it('should have the value of the updated collection after n updates have been retrieved');

            it('should end when an http get fails');
        });
    });

    describe('put', function () {
        it('should return a Kefir stream');

        it('should only call http get / put functions safely');

        describe('returned stream', function () {
            it('should end with an error when the http put fails');

            it('should end with a struct containing id and revision when the http put succeeds');
        });
    });
});
