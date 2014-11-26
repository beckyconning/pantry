var Kefir = require('kefir');
var T     = require('tcomb');

var getViewSpy         = function () { return this.viewEmitter; };
var getChangedDocsSpy  = function () { return this.changedDocsEmitter; };

var getView = T.func([T.Str, T.Str], T.Obj)
    .of(function (x, y) { return this.getViewSpy(x, y); });

var getChangedDocs = T.func([T.Str, T.Str, T.Num], T.Obj)
    .of(function (x, y, z) { return this.getChangedDocsSpy(x, y, z); });

var initEmitters = function () {
    this.viewEmitter        = Kefir.emitter();
    this.changedDocsEmitter = Kefir.emitter();
};

module.exports = {
    viewEmitter:        undefined,
    changedDocsEmitter: undefined,
    getView:            getView,
    getChangedDocs:     getChangedDocs,
    getViewSpy:         jasmine.createSpy('getViewSpy').and.callFake(getViewSpy),
    getChangedDocsSpy:  jasmine.createSpy('getChangedDocSpy').and.callFake(getChangedDocsSpy),
    initEmitters:       initEmitters
};
