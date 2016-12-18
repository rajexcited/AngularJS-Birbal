module.exports = function (grunt) {

    // prod will get published.
    var ENV = (grunt.option('prod') && 'prod') || (grunt.option('dev') && 'dev');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            // define the files to lint
            files: ['Gruntfile.js', 'src/**/*(!*.generated).js', 'test/**/*.js'],
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
                    'dist/message.min.js': ['src/message.js']
                }
            },
            'uglify-inspector': {
                options: {
                    preserveComments: false,
                    mangle: false,
                    compress: false,
                    beatify: true
                },
                files: {
                    'src/content-script/inject/angularinspector.min.js': ['src/content-script/inject/angularinspector.js']
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
                    {src: ['src/panel/partials/*.html'], dest: 'zip/'},
                    {src: 'src/devtools/*', dest: 'zip/'},
                    {src: 'src/content-script/inject/angularinspector.min.js', dest: 'zip/'},
                    {expand: true, cwd: 'src/popup', src: ['**/*.js', '*.html'], dest: 'zip/src/popup'}
                ]
            },
            'lib-angular-mock': {
                options: {
                    process: function (content) {
                        return content.replace('(function(window, angular) {', 'window.injectMock=(function(window, angular) {')
                            .replace('})(window, window.angular);', '});');
                    }
                },
                src: 'node_modules/angular-mocks/angular-mocks.js',
                dest: 'lib/angular-mocks.js'
            },
            // compile and generate lib folder
            lib: {
                files: [
                    // angular
                    {src: 'node_modules/angular/angular.min.js', dest: 'lib/angular.min.js'},
                    {src: 'node_modules/angular-animate/angular-animate.min.js', dest: 'lib/angular-animate.min.js'},
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
                    {
                        src: 'node_modules/admin-lte/bootstrap/fonts/glyphicons-halflings-regular.ttf',
                        dest: 'lib/admin-lte/fonts/glyphicons-halflings-regular.ttf'
                    },
                    {
                        src: 'node_modules/admin-lte/bootstrap/fonts/glyphicons-halflings-regular.woff',
                        dest: 'lib/admin-lte/fonts/glyphicons-halflings-regular.woff'
                    },
                    {
                        src: 'node_modules/admin-lte/bootstrap/fonts/glyphicons-halflings-regular.woff2',
                        dest: 'lib/admin-lte/fonts/glyphicons-halflings-regular.woff2'
                    },
                    {
                        src: 'node_modules/font-awesome/fonts/fontawesome-webfont.woff2',
                        dest: 'lib/admin-lte/fonts/fontawesome-webfont.woff2'
                    },
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
                    // react
                    {src: 'node_modules/react/dist/react.min.js', dest: 'lib/react.min.js'},
                    {src: 'node_modules/react-dom/dist/react-dom.min.js', dest: 'lib/react-dom.min.js'},
                    // other vendor files
                    {expand: true, cwd: 'vendor/', src: '**', dest: 'lib/'}
                ]
            }
        },
        compress: {
            main: {
                options: {
                    'archive': function () {
                        var manifest = grunt.file.readJSON('manifest.json'),
                            pkg = grunt.config('pkg');

                        if (manifest.version !== pkg.version) {
                            throw new Error('version must be same for both package.json and manifest.json.\n package.json = "' + pkg.version + '"\nmanifest.json = "' + manifest.version + '"');
                        }
                        return 'zip/birbaljs-extension-v' + pkg.version + '.zip';
                    }
                },
                files: [
                    {expand: true, cwd: 'zip/', src: ['**/*'], dest: '/'},
                    {src: ['lib/**', 'img/*', 'manifest.json', 'LICENSE', 'README.md'], dest: '/'}
                ]
            }
        },
        template: {
            index: {
                options: {
                    data: function () {
                        var allIncludes = grunt.file.readJSON('include.json');
                        return allIncludes[ENV];
                    }
                },
                files: {
                    'src/panel/partials/index.html': ['src/panel/partials/index.html.template']
                }
            }
        },
        clean: {
            compress: ['zip/**'],
            'build-local': ['dist/**', 'lib/**', 'src/panel/partials/index.html', 'src/**/*.min.js', 'src/**/*.generated.js']
        },
        connect: {
            example: {
                options: {
                    port: 8000,
                    keepalive: true,
                    open: 'http://localhost:8000/example/exampleApp.html'
                }
            }
        }
    });

    // time for each task
    require('time-grunt')(grunt);
    require('jit-grunt')(grunt);

    // Default task(s).
    grunt.registerTask('default', ['jshint']);
    // creating zip file for distribution
    grunt.registerTask('build-extension', ['jshint', 'template', 'concat', 'uglify', 'copy', 'compress']);
    // for development
    grunt.registerTask('build', ['jshint', 'uglify:uglify-inspector', 'copy:lib', 'copy:lib-angular-mock', 'template']);
};