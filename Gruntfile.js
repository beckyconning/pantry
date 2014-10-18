module.exports = function(grunt) {

    grunt.initConfig({
        browserify: {
            pantry: {
                src: ['src/**'],
                dest: 'pantry.js',
                alias: ['request:browser-request']
            }
        },

        karma: {
            jasmine_continuous: {
                frameworks: ['browserify', 'jasmine'],
                singleRun: false,
                port: 9876,
                runnerPort: 9100,
                autoWatch: true,
                captureTimeout: 60000,
                exclude: ['**/*.md'],
                reporters: ['story'],
                browsers: ['Firefox'],
                client: {
                    captureConsole: false
                },
                preprocessors: {
                    './spec/*': ['browserify']
                },
                browserify: {
                    alias: ['request:browser-request'],
                    debug: true
                },
                configFile: './jasmine.karma.conf.js'
            },

            jasmine: {
                frameworks: ['browserify', 'jasmine'],
                singleRun: true,
                port: 9876,
                runnerPort: 9100,
                autoWatch: false,
                captureTimeout: 60000,
                exclude: ['**/*.md'],
                reporters: ['story'],
                browsers: ['Firefox'],
                client: {
                    captureConsole: false
                },
                preprocessors: {
                    './spec/*': ['browserify']
                },
                browserify: {
                    alias: ['request:browser-request'],
                    debug: true
                },
                configFile: './jasmine.karma.conf.js'
            }
        },

        shell: {
            jasmine_node: {
                command: './node_modules/.bin/jasmine-node --verbose ./spec/pantry-spec.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('spec:browser-continuous', ['karma:jasmine_continuous']);
    grunt.registerTask('spec:browser', ['karma:jasmine']);
    grunt.registerTask('spec:node', ['shell:jasmine_node']);

    grunt.registerTask('default', []);

};
