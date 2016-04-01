module.exports = function (grunt) {

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
                    'dist/content-script/inject/angularinspector.min.js': ['src/content-script/inject/angularinspector.js']
                }
            }
        },
        copy: {
            main: {
                files: [
                    // src files
                    // copy all minified in dist to src and rename to .js
                    {expand: true, cwd: 'dist/', src: '**/*.min.js', dest: 'zip/src/', ext: '.js'},
                    {expand: true, cwd: 'src/panel/css/', src: '*.css', dest: 'zip/src/panel/'},
                    {src: 'src/panel/partials/*.html', dest: 'zip/'},
                    {src: 'src/devtools/devToolsPage.html', dest: 'zip/src/devtools/devToolsPage.html'},
                    {src: 'src/devtools/devToolsPage.js', dest: 'zip/src/devtools/devToolsPage.js'},
                    // node-modules/lib files
                    // angular
                    {src: 'node_modules/angular/angular.min.js', dest: 'zip/lib/angular/angular.js'},
                    // jquery
                    {src: 'node_modules/jquery/dist/jquery.js', dest: 'zip/lib/jquery/jquery.js'},
                    // admin-lte
                    {
                        expand: true,
                        cwd: 'node_modules/admin-lte/',
                        flatten: true,
                        src: ['bootstrap/js/bootstrap.min.js', 'dist/js/app.min.js'],
                        dest: 'zip/lib/admin-lte/js/'
                    },
                    {
                        expand: true,
                        cwd: 'node_modules/admin-lte/',
                        flatten: true,
                        src: ['bootstrap/css/bootstrap.min.css', 'dist/css/AdminLTE.min.css', 'dist/css/skins/skin-blue.min.css'],
                        dest: 'zip/lib/admin-lte/css/'
                    },
                    // ion-rangeslider
                    {
                        src: 'node_modules/ion-rangeslider/js/ion.rangeSlider.min.js',
                        dest: 'zip/lib/ion-rangeslider/js/ion.rangeSlider.min.js'
                    },
                    {
                        expand: true,
                        cwd: 'node_modules/ion-rangeslider/css/',
                        src: ['ion.rangeSlider.skinNice.css', 'ion.rangeSlider.css', 'normalize.css'],
                        dest: 'zip/lib/ion-rangeslider/css/'
                    },
                    // floathead
                    {
                        src: 'node_modules/floatthead/dist/jquery.floatThead.min.js',
                        dest: 'zip/lib/floatthead/jquery.floatThead.min.js'
                    }
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
        clean: {
            dist: ['dist/**'],
            compress: ['zip/**']
        }
    });

    // time for each task
    require('time-grunt')(grunt);

    // Load the plugins to run below registered tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');

    // Default task(s).
    grunt.registerTask('default', ['clean:dist', 'jshint', 'concat', 'uglify']);
    grunt.registerTask('build-extension', ['default', 'clean:compress', 'copy', 'compress']);

};