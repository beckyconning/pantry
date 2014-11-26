var Kefir = require('kefir');

var a = Kefir.emitter();

var b = Kefir.emitter();

var c = a.delay(0);

var d = c.merge(b.delay(0));

var e = d.scan({}, function (prev, next) { return prev + next; });

a.emit(1);
b.emit(1);

console.log(e instanceof Kefir.Property);
