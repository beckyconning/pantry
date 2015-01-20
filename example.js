#!/usr/bin/env node
var pantry = require('./src/pantry');
var couchDbUri = process.argv[2];
var dbName = process.argv[3];

var label = 'preserve';
var preserveName = 'Strawberry Jam';

var preserves = pantry.contents(couchDbUri, dbName, label).onValue(function (preserves) {
    process.stdout.write('\033c');
    console.log(preserves);
});

pantry.put(couchDbUri, dbName, label, { name: preserveName }).then(function (revision) {
    console.log('Labelled the ' + preserveName + ' and put it into the pantry with revision ' + revision + '.');
});
