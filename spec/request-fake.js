'use strict';

var Promise = require('bluebird');

var requestFake = function requestFake(options, callback) {
    requestFake.callbacks.push(callback);
};

requestFake.callbacks = [];

requestFake.callback = function (error, response, body) {
    requestFake.callbacks.pop()(error, response, body);
    return new Promise(function (resolve) {
        setTimeout(resolve, 0);
    });
};

requestFake.allCallbacks = function (error, response, body) {
    var promises = requestFake.callbacks.map(function (callback) {
        console.log(callback);
        callback(error, response, body);
        return new Promise(function (resolve) {
            setTimeout(resolve, 0);
        });
    });
    requestFake.callbacks.reset();
    return Promise.all(promises);
};

requestFake.callbacks.reset = function () {
    requestFake.callbacks.length = 0;
};

module.exports = requestFake;
