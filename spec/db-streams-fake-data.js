'use strict';

var initialUpdateSeq = 4;
var initialDocs = [
    { '_id': 'preserve_ace2', '_rev': '1-7273', 'name': 'Raspberry Jam',   'sodium': 0.5 },
    { '_id': 'preserve_rap2', '_rev': '1-3851', 'name': 'Crabberry Sauce', 'sodium': 0.12 },
    { '_id': 'preserve_4ab3', '_rev': '1-4823', 'name': 'Onion Chutney',   'sodium': 0.18 },
    { '_id': 'preserve_4b59', '_rev': '1-4823', 'name': 'Mango Chuckney',  'sodium': 0.21 }
];
var initialRows = initialDocs.map(function (element) { return { 'doc': element }; });
var initialView = { 'update_seq': initialUpdateSeq, 'rows': initialRows };

var firstChangedDocs = [
    { '_id': 'preserve_ace2',   '_rev': '2-9f9c', 'name': 'Raspberry Jam',   'sodium': 0.1 },
    { '_id': 'preserve_rap2',   '_rev': '2-c90c', 'name': 'Cranberry Sauce', '_deleted': true },
    { '_id': 'preserve_4b59',   '_rev': '4-c49d', 'name': 'Mango Chutney' }
];
var secondChangedDocs = [{ '_id': 'preserve_rap2', '_rev': '3-fa9d' }];
var thirdChangedDocs  = [{ '_id': 'preserve_4b59', '_rev': '5-f8da' }];

module.exports = {
    initialUpdateSeq:  initialUpdateSeq,
    initialDocs:       initialDocs,
    initialView:       initialView,
    firstChangedDocs:  firstChangedDocs,
    secondChangedDocs: secondChangedDocs,
    thirdChangedDocs:  thirdChangedDocs
};

// { '_id': 'tinned_veg_n49a', '_rev': '4-42dc', 'name': 'Carrots',         'in': 'brine' },
