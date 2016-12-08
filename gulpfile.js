'use strict'; // eslint-disable-line

const gulp = require('gulp');
const path = require('path');
const beep = require('beepbeep');

const sass = require('gulp-sass');
const rename = require('gulp-rename');
const gutil = require('gulp-util');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');

const rollup = require('rollup-stream');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const globby = require('globby');

const browserSync = require('browser-sync').create();

const baseDir = '.';
const srcDir = `${baseDir}/source`;
const publicDir = `${baseDir}/public`;
const browserSyncSettings = {
    logConnections: false,
    logFileChanges: false,
    logLevel: 'info',
    logSnippet: true,
    open: false,
    port: 3005,
    proxy: 'http://starter-files-web.app',
    reloadDebounce: 500,
};

function errorHandler(error) {
    beep(1);
    gutil.log(gutil.colors.red(error.message));
    this.emit('end');
}

function initBrowserSync() {
    browserSync.init(browserSyncSettings);
}

gulp.task('styles', [], () => {
    gulp.src([
        `${srcDir}/styles/index.scss`,
    ])
    .pipe(sourcemaps.init())
    .pipe(sass({
        includePaths: [`${srcDir}/styles`, 'node_modules'],
        outputStyle: 'compressed',
    }))
    .on('error', errorHandler)
    .pipe(postcss([
        require('autoprefixer')({
            browsers: ['> 1%', 'last 2 version', 'ie 9'],
        }),
    ]))
    .on('error', errorHandler)
    .pipe(rename({
        suffix: '.min',
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${publicDir}/styles`))
    .pipe(browserSync.stream({
        match: '**/**.css',
    }));
});

const createBundle = (entry) => {
    const basename = path.basename(entry);
    return rollup({
        context: 'window',
        entry,
        plugins: [
            require('rollup-plugin-includepaths')({
                paths: [srcDir, 'node_modules'],
            }),
            require('rollup-plugin-node-resolve')(),
            require('rollup-plugin-commonjs')({
                include: 'node_modules/**',
            }),
            require('rollup-plugin-buble')(),
            require('rollup-plugin-uglify')(),
        ],
        sourceMap: true,
    })
    .on('error', errorHandler)
    .pipe(source(basename, `${srcDir}/scripts`))
    .pipe(buffer())
    .pipe(sourcemaps.init({
        loadMaps: true,
    }))
    .pipe(rename({
        suffix: '.min',
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${publicDir}/scripts`));
};

gulp.task('scripts', [], (cb) => {
    globby([
        `${srcDir}/scripts/*.js`,
    ])
    .then((entries) => {
        const count = entries.length;
        let bundlesComplete = 0;
        entries.forEach((entry) => {
            const bundle = createBundle(entry);
            bundle.on('finish', () => {
                bundlesComplete += 1;
                if (count === bundlesComplete) {
                    cb();
                }
            }).on('error', errorHandler);
        });
    });
});

gulp.task('watch', ['default'], () => {
    if (gutil.env.sync) {
        initBrowserSync();
    }
    gulp.watch([
        `${srcDir}/scripts/**/**.js`,
    ], ['scripts']);
    gulp.watch([
        `${srcDir}/styles/**/**.scss`,
    ], ['styles']);
    gulp.watch([
        `${publicDir}/scripts/**/**.js`,
        `${baseDir}/**/**.{html,php}`,
    ]).on('change', browserSync.reload);
});

gulp.task('default', [
    'styles',
    'scripts',
]);
