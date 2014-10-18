module.exports = function (config) {
    config.set({
        files: [
            // template files
            { pattern: './src/**', watched: true, included: false, served: true },

            // unit tests
            { pattern: './spec/**', watched: true, included: true, served: true },
        ]
    });
};
