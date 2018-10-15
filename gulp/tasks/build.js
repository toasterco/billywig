import browserSyncLib  from 'browser-sync';
import del             from 'del';
import path            from 'path';
import gulp            from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import runSequence     from 'run-sequence';
import config          from '../config/base_config';

const $           = gulpLoadPlugins();
const browserSync = browserSyncLib.create();

gulp.task('clean', () => {
  return del.sync(config.dist);
});

gulp.task('html', () => {
  /**
   * Sequence of events: 
   * 1. SCSS is compiled and injected into HTML within <style> tag
   * 2. CSS is inlined using rules within <style> tag as reference
   * 3. Output finished HTML file
   */
  return gulp
    .src('src/**/*.html')
    .pipe(
      $.tap((file) => {
        const dirname    = path.dirname(file.path);
        const dirparts   = dirname.split(config.projectBasePath);
        const fileDir    = dirparts[dirparts.length - 1];
        const fileName   = path.basename(file.path);
        const currentSrc = `${config.projectBasePath}${fileDir}`;

        return gulp
          .src(`${currentSrc}/${fileName}`)
          .pipe(
            $.htmlReplace({
              css: {
                src: gulp
                  .src(`${currentSrc}/*.scss`)
                  .pipe(
                    $.sass({
                      outputStyle: 'expanded'
                    })
                  ),
                tpl: '<style>\n%s</style>'
              }
            })
          )
          .pipe(
            $.inlineCss({
              preserveMediaQueries: true,
              removeLinkTags      : false
            })
          )
          .pipe(gulp.dest(`${config.dist}${fileDir}`));
      })
    );
});

gulp.task('hot_reload', () => {
  return gulp.src(config.dist)
    .pipe(browserSync.reload({
      stream: true
    }));
});

gulp.task('media', () => {
  return gulp
    .src(`${config.dist}/**/*.html`)
    .pipe($.tap((file) => {
      /** retrieve source files */
      const contents = file.contents.toString();
      let   assets   = contents.match(config.mediaRegex);
      /** bail if there're no assets */
      if (!assets) {
        return false;
      }
      /** map file names to respective asset directories */
      assets = assets.map((item) => {
        return `${config.assetsBaseDir}/${config.assetsImgDir}/${item}`;
      });
      /** copy files over */
      return gulp
        .src(assets)
        .pipe($.imagemin())
        .pipe(gulp.dest(path.dirname(file.path)));
    }));
});

gulp.task('watch', () => {
  browserSync.init({
    server: {
      baseDir  : config.dist,
      directory: true,
      index    : 'index.html'
    }
  }, (err, bs) => {
    config.defaultLocalUrl += bs.options.get('port');
    gulp.watch([
      'src/assets/**/*',
      'src/**/*.html',
      'src/**/js/*.js',
      'src/**/*.scss',
    ], () => {
      runSequence('dist', 'hot_reload');
    });
  });
});

gulp.task('dist', ['clean'], (callback) => {
  runSequence('html', 'media', callback);
});

gulp.task('serve', (callback) => {
  runSequence('dist', 'watch', callback);
});

gulp.task('default', ['dist']);