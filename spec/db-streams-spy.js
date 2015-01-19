var Kefir = require('kefir');
var T     = require('tcomb');

var getViewFake        = function () { return this.viewEmitter; };
var getChangedDocsFake = function () { return this.changedDocsEmitter; };

var getView = T.func([T.Str, T.Str], T.Obj)
    .of(function (x, y) { return this.viewSpy(x, y); });

var getChangedDocs = T.func([T.Str, T.Str, T.Num], T.Obj)
    .of(function (x, y, z) { return this.changedDocsSpy(x, y, z); });

var initEmitters = function () {
    this.viewEmitter        = Kefir.emitter();
    this.changedDocsEmitter = Kefir.emitter();
};

module.exports = {
    viewEmitter:        undefined,
    changedDocsEmitter: undefined,
    getView:            getView,
    getChangedDocs:     getChangedDocs,
    getViewSpy:            jasmine.createSpy('getView').and.callFake(getViewFake)
    getChangedDocsSpy:     jasmine.createSpy('getChangedDocs').and.callFake(getChangedDocsFake),
    initEmitters:       initEmitters
};
