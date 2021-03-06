var gulp = require('gulp');

var watch = require('gulp-watch');
var rollup = require('rollup-stream');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var merge = require('merge-stream');
var iife = require('gulp-iife');
var sass = require('gulp-sass');
var csso = require('gulp-csso');

var nodeResolve = require('rollup-plugin-node-resolve');
var ractive = require('rollup-plugin-ractive');

var del = require('del');
var fs = require('fs');
var httpServer = require('http-server');


var jsSrc = ['./js/**/*.js', './view/**/*.ractive'];
var sassSrc = './view/**/*.scss';
var assetsSrc = './assets/**/*';

var jsEntry = './js/main.js';
var sassEntry = './view/main.scss';


var ractiveSrc = '/ractive/src/';

function rollupPlugins(options) {
  const debug = options.debug;
  return [
    {
      resolveId: function(importee, importer) {
        if(importee === 'ractive') {
          return nodeResolve().resolveId('ractive/src/Ractive.js', importer);
        }
        if(importee === 'is-debug-build') {
          return importee;
        }
      },
      load: function(id) {
        if(id === 'is-debug-build') {
          return 'export default ' + JSON.stringify(debug) +';';
        }
      },
      transform: function(source, id) {
        if(!id) {
          return;
        }
        if(id.indexOf(ractiveSrc) !== -1) {
          if(/legacy\.js|_parse\.js|_Triple\.js/.test(id)) {
            return 'export default null;';
          }
          if(/(Ractive\.js|utils[\/\\]log\.js)$/.test(id)) {
            return source.replace(/<@version@>/g, require('ractive/package.json').version);
          }
        }
      },
    },
    nodeResolve(),
    ractive({
      extensions: ['.ractive'],
    }),
  ];
}

var cache;
gulp.task('js', function() {
  return rollup({
    entry: jsEntry,
    cache: cache,
    plugins: rollupPlugins({ debug: true }),
  })
  .on('bundle', function(module) {
    cache = module;
  })
  .on('error', function(e) {
    console.error(e.stack);
  })
  .pipe(source('main.js', './js'))
  .pipe(buffer())
  .pipe(iife())
  .pipe(gulp.dest('./dist'));
});

gulp.task('css', function() {
  return gulp.src(sassEntry)
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest('./dist'));
});

gulp.task('assets', function() {
  return gulp.src(assetsSrc)
  .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['default'], function() {
  var js = watch(jsSrc, { read: false }, function() {
    gulp.start('js');
  });
  
  var assets = watch(assetsSrc)
  .pipe(gulp.dest('./dist'));
  
  var css = watch(sassSrc, { read: false }, function() {
    gulp.start('css');
  });
  
  return merge(js, assets);
});

gulp.task('webserver', ['default'], function(cb) {
  httpServer.createServer({ root: './dist' }).listen(8080);
  console.log("\nhttp://localhost:8080/index.html");
});

gulp.task('watchserver', ['watch', 'webserver']);

gulp.task('clean', function(cb) {
  del('./dist/**/*').then(function() { cb(); });
});

gulp.task('default', ['js', 'css', 'assets']);

gulp.task('js-minified', function() {
  return rollup({
    entry: jsEntry,
    plugins: rollupPlugins({ debug: false }),
  })
  .on('error', function(e) {
    console.error(e.stack);
  })
  .pipe(source('main.js', './js'))
  .pipe(buffer())
  .pipe(babel({ presets: ['es2015-minimal'] }))
  .pipe(iife())
  .pipe(uglify({
    mangle: {
      except: ['createASM'],
    },
  }))
  .pipe(gulp.dest('./dist'));
});

gulp.task('css-minified', function() {
  return gulp.src(sassEntry)
  .pipe(sass().on('error', sass.logError))
  .pipe(csso())
  .pipe(gulp.dest('./dist'));
});

gulp.task('minified', ['js-minified', 'css-minified', 'assets']);

gulp.task('webserver-minified', ['minified'], function(cb) {
  httpServer.createServer({ root: './dist' }).listen(8080);
  console.log("\nhttp://localhost:8080/index.html");
});
