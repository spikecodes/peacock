var gulp = require('gulp'),
    sass = require('gulp-sass');

gulp.task('scss', function () {
    return gulp.src('css/main.scss')
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(gulp.dest('css/'));
});

gulp.task('default',['scss'], function () {
    gulp.watch('css/*.scss', ['scss']);
});