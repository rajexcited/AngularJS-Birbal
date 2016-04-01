module.exports = function (grunt) {

    var ENV = (grunt.option('prod') && 'prod') || (grunt.option('dev') && 'dev');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            // define the files to lint
            files: ['Gruntfile.js', 'src/**/panel/js/*.js', 'test/**/*.js'],
            // configure JSHint (documented at http://www.jshint.com/docs/)
            options: {
                // more options here if you want to override JSHint defaults
                globals: {
                    jQuery: true
                }
            }
        },
        concat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: ';'
            },
            dist: {
                // the files to concatenate
                src: ['src/**/panel/js/**/*.js'],
                // the location of the resulting JS file
                dest: 'dist/panel/panel.js'
            }
        },
        uglify: {
            options: {
                // the banner is inserted at the top of the output
                banner: '/*! <%= pkg.name%> v<%= pkg.version %>  | <%= grunt.template.today("dd-mm-yyyy") %> | <%= pkg.homepage%> */\n'
            },
            dist: {
                files: {
                    'dist/panel/panel.min.js': ['<%= concat.dist.dest %>'],
                    'dist/background/background.min.js': ['src/background/background.js'],
                    'dist/content-script/content-script.min.js': ['src/content-script/content-script.js'],
                    'dist/content-script/inject/angularinspector.min.js': ['src/content-script/inject/angularinspector.js'],
                    'dist/message.min.js': ['src/message.js']
                }
            }
        },
        copy: {
            src: {
                files: [
                    // src files
                    // copy all minified in dist to src and rename to .js
                    {expand: true, cwd: 'dist/', src: '**/*.min.js', dest: 'zip/src/', ext: '.js'},
                    {expand: true, cwd: 'src/panel/css/', src: '*.css', dest: 'zip/src/panel/'},
                    {src: ['src/panel/partials/*', '!src/panel/partials/index.html'], dest: 'zip/'},
                    {src: 'src/devtools/devToolsPage.html', dest: 'zip/src/devtools/devToolsPage.html'},
                    {src: 'src/devtools/devToolsPage.js', dest: 'zip/src/devtools/devToolsPage.js'}
                ]
            },
            // compile and generate lib folder
            lib: {
                files: [
                    // angular
                    {src: 'node_modules/angular/angular.min.js', dest: 'lib/angular.min.js'},
                    // jquery
                    {src: 'node_modules/jquery/dist/jquery.min.js', dest: 'lib/jquery.min.js'},
                    // admin-lte, bootstrap and font-awesome
                    {
                        expand: true,
                        cwd: 'node_modules/admin-lte/',
                        flatten: true,
                        src: ['bootstrap/js/bootstrap.min.js', 'dist/js/app.min.js'],
                        dest: 'lib/admin-lte/js/'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: ['node_modules/font-awesome/css/font-awesome.min.css', 'node_modules/admin-lte/bootstrap/css/bootstrap.min.css', 'node_modules/admin-lte/dist/css/AdminLTE.min.css', 'node_modules/admin-lte/dist/css/skins/skin-blue.min.css'],
                        dest: 'lib/admin-lte/css/'
                    },
                    {src: 'fonts/*', dest: 'lib/admin-lte/', expand: true, cwd: 'node_modules/font-awesome/'},
                    // ion-rangeslider
                    {
                        expand: true,
                        cwd: 'node_modules/ion-rangeslider/',
                        src: [
                            // js
                            'js/ion.rangeSlider.min.js',
                            // css
                            'css/ion.rangeSlider.skinNice.css', 'css/ion.rangeSlider.css', 'css/normalize.css',
                            'img/sprite-skin-nice.png'
                        ],
                        dest: 'lib/ion-rangeslider/'
                    },
                    // other vendor files
                    {expand: true, cwd: 'vendor/', src: '**', dest: 'lib/'}
                    //, not using this lib
                    // floathead
                    //{
                    //    src: 'node_modules/floatthead/dist/jquery.floatThead.min.js',
                    //    dest: 'lib/jquery.floatThead.min.js'
                    //}
                ]
            }
        },
        compress: {
            main: {
                options: {
                    archive: 'zip/extension.zip'
                },
                files: [
                    {expand: true, cwd: 'zip/', src: ['**/*'], dest: '/'},
                    {src: ['lib/**', 'img/*'], dest: '/'}
                ]
            }
        },
        'template': {
            'index': {
                'options': {
                    'data': function () {
                        "use strict";
                        var allIncludes = grunt.file.readJSON('include.json');
                        if (!ENV) {
                            throw Error('no environment defined. use argument --dev.');
                        }
                        return allIncludes[ENV];
                    },
                    dest: ENV === 'prod' ? 'dist/' : ''
                },
                'files': {
                    '<%= template.index.options.dest%>src/panel/partials/index.html': ['src/panel/partials/index.html.template']
                }
            }
        },
        clean: {
            dist: ['dist/**'],
            compress: ['zip/**'],
            lib: ['lib/**'],
            template: ['src/panel/partials/index.html', 'dist/src/panel/partials/index.html']
        }
    });

    // time for each task
    require('time-grunt')(grunt);
    require('jit-grunt')(grunt);

    // Load the plugins to run below registered tasks. - lazy loading using jit-grunt
    //grunt.loadNpmTasks('grunt-contrib-clean');
    //grunt.loadNpmTasks('grunt-contrib-uglify');
    //grunt.loadNpmTasks('grunt-contrib-jshint');
    //grunt.loadNpmTasks('grunt-contrib-concat');
    //grunt.loadNpmTasks('grunt-contrib-copy');
    //grunt.loadNpmTasks('grunt-contrib-compress');
    //grunt.loadNpmTasks('grunt-template');

    // Default task(s).
    grunt.registerTask('default', ['jshint']);
    // creating zip file for distribution
    grunt.registerTask('build-extension', ['default', 'clean:dist', 'clean:compress', 'concat', 'uglify', 'copy', 'compress']);

    // for development
    grunt.registerTask('build', ['clean', 'copy:lib', 'template']);
};