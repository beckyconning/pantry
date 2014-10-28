'use strict';

var _ = require('underscore');

var passedFirstArg = function (spy, firstArgument) {
    var allFirstArgs = spy.calls.allArgs().map(function (args) {
        return args[0];
    });

    return _.findWhere(allFirstArgs, firstArgument);
};

module.exports = passedFirstArg;
