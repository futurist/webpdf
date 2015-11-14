var gulp = require('gulp');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var minifyHtml = require('gulp-minify-html');
var minifyCss = require('gulp-minify-css');
var htmlreplace = require('gulp-html-replace');


gulp.task('html', function() {
  var opts = {
    conditionals: true,
    spare:true,
    comments:false,
    quotes:true
  };

  return gulp.src('./viewerSrc.html')
    .pipe(concat('viewer.html'))
    .pipe(htmlreplace({
    	css:{ src:'build1.css', tpl:'<link rel="stylesheet" href="%s" type="text/css">'},
    	s0:{ src:'s0.js', tpl:'<script type="text/javascript" src="%s"></script>'},
    	s1:{ src:'s1.js', tpl:'<script type="text/javascript" src="%s"></script>'},
    	s2:{ src:'s2.js', tpl:'<script type="text/javascript" src="%s"></script>'},
     }, {keepUnassigned:true} ) )
    .pipe(replace(/manifest=""/, 'manifest="app2.manifest"'))
    .pipe(minifyHtml(opts))
    .pipe(gulp.dest('./'));
});


// replace all.js file basket content with s2.js,s3.js block
gulp.task('appCache', function(){
  gulp.src(['app.manifest'])
  	.pipe(concat('app2.manifest'))
    .pipe(replace(/#VERSION /, '#VERSION '+ (+new Date()) ))
    .pipe(gulp.dest('./'));
});


gulp.task('css', function  () {
	gulp.src([
		'./viewer.css',
		'./js/dialog.css',
		'./css/font-awesome.min.css',
		'./selectivity-full.css',
		])
	.pipe(concat('build1.css'))
	.pipe(minifyCss())
	.pipe(gulp.dest('./'))
});




gulp.task('s0', function  () {
	gulp.src([
		'compatibility.js',
		'l10n.js',
		])
	.pipe(concat('s0.js'))
	// .pipe(uglify())
	.pipe(gulp.dest('./'))
});

gulp.task('s1', function  () {
	gulp.src([
		// 'compatibility.js',
		// 'l10n.js',
		'js/cookies.js',
		'js/glyphicon.js',
		'js/zepto.js',

		'js/dialog.build.js',
		'js/hammer.min.js',
		'victor.js',
		'js/jweixin-1.1.0.js',
		'draggable.js',
		'path.js',
		'js/selectivity-full.js',
		'js/mithril.min.js',
		])
	.pipe(concat('s1.js'))
	.pipe(uglify())
	.pipe(gulp.dest('./'))
});

gulp.task('s2', function  () {
	gulp.src([
		'./pdf.js',
		'./drawer.js',
		'./viewer.js',
		])
	.pipe(concat('s2.js'))
	.pipe(uglify())
	.pipe(gulp.dest('./'))
});

// default gulp task
gulp.task('default', ['s0','s1', 's2', 'css', 'html', 'appCache'], function() {

});



