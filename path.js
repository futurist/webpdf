/*Copyright (c) 2013 Jake Scott
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE. */

var OPHistory = new function() {

	var _doChain = [];
	var _undoChain = [];
	var _maxLength = 50;

	var Action =  function(up, down, name) {
		this.up = up;
		this.down = down;
		this.name = name;
	};

	this.do = function(up, down, name) {
		if(!up) {
			throw "OPHistory.do missing required parameter 'up'."
		}
		else if(!down) {
			throw "OPHistory.do missing required parameter 'down'."
		}
		else {
			var _action = new Action(up, down, name);
			_undoChain = [];
			_action.up();
			_doChain.push(_action);
			while(_doChain.length > _maxLength) {
				_doChain.shift();
			}
		}
	};

	this.undo = function() {
		var _undone = _doChain.pop();
		if(_undone) {
			_undone.down();
			_undoChain.push(_undone);
		}
		else {
			//console.warn("Nothing to undo.");
		}
	};

	this.redo = function() {
		var _redone = _undoChain.pop();
		if(_redone) {
			_redone.up();
			_doChain.push(_redone);
		}
		else {
			//console.warn("Nothing to redo");
		}
	}
}



//************************************************
//
// Catmull-Rom Spline to Bezier Spline Converter
//
//
// This is an experimental extension of the SVG 'path' element syntax to
// allow Catmull-Rom splines, which differs from BÃ©zier curves in that all
// defined points on a Catmull-Rom spline are on the path itself.
//
// This is intended to serve as a proof-of-concept toward inclusion of a
// Catmull-Rom path command into the SVG 2 specification.  As such, it is
// not production-ready, nor are the syntax or resulting rendering stable;
// notably, it does not include a 'tension' parameter to allow the author
// to specify how tightly the path interpolates between points.  Feedback
// on this and other aspects is welcome.
//
// The syntax is as follows:
// ([number],[number])+  R([number],[number])+ ([number],[number])*
// In other words, there must be at least one coordinate pair preceding the
// Catmull-Rom path segment (just as with any other path segment), followed
// by the new path command 'R', followed by at least two coordinate pairs,
// with as many optional subsequent coordinate pairs as desired.
//
// (As with path syntax in general, the numbers may be positive or negative
// floating-point values, and the delimiter is any combination of spaces
// with at most one comma.)
//
// License:
// This code is available under the MIT or GPL licenses, and it takes
// inspiration from Maxim Shemanarev's Anti-Grain Geometry library.
//
// Contact info:
// www-svg@w3.org for public comments (preferred),
// schepers@w3.org for personal comments.
//
// author: schepers, created: 07-09-2010
//
//************************************************


function init() {
  // find each path, to see if it has Catmull-Rom splines in it
  var pathEls = document.documentElement.getElementsByTagName("path");
  for (var p = 0, pLen = pathEls.length; pLen > p; p++) {
    var eachPath = pathEls[ p ];
    parsePath( eachPath );
  }
}

function parsePath( path, isString, t ) {
  var pathArray = [];
  var lastX = "";
  var lastY = "";

  var d = isString ? path : path.getAttribute( "d" );
  if ( -1 != d.search(/[rR]/) ) {
    // no need to redraw the path if no Catmull-Rom segments are found

    // split path into constituent segments
    var pathSplit = d.split(/([A-Za-z])/);
    for (var i = 0, iLen = pathSplit.length; iLen > i; i++) {
      var segment = pathSplit[i];

      // make command code lower case, for easier matching
      // NOTE: this code assumes absolution coordinates, and doesn't account for relative command coordinates
      var command = segment.toLowerCase()
      if ( -1 != segment.search(/[A-Za-z]/) ) {
        var val = "";
        if ( "z" != command ) {
          i++;
          val = pathSplit[ i ].replace(/\s+$/, '');
        }

        if ( "r" == command ) {
          // "R" and "r" are the a Catmull-Rom spline segment

          var points = lastX + "," + lastY + " " + val;

          // convert Catmull-Rom spline to BÃ©zier curves
          var beziers = catmullRom2bezier( points, t );
          //insert replacement curves back into array of path segments
          pathArray.push( beziers );
        } else {
          // rejoin the command code and the numerical values, place in array of path segments
          pathArray.push( segment + val );

          // find last x,y points, for feeding into Catmull-Rom conversion algorithm
          if ( "h" == command ) {
            lastX = val;
          } else if ( "v" == command ) {
            lastY = val;
          } else if ( "z" != command ) {
            var c = val.split(/[,\s]/);
            lastY = c.pop();
            lastX = c.pop();
          }
        }
      }
    }
    // recombine path segments and set new path description in DOM
    if(isString) return pathArray.join(" ");
    path.setAttribute( "d", pathArray.join(" ") );
  }
}



function catmullRom2bezier( points, t ) {
  // alert(points)
  var crp = points.split(/[,\s]+/);

  var d = "";
  for (var i = 0, iLen = crp.length; iLen - 2 > i; i+=2) {
    var p = [];
    if ( 0 == i ) {
      p.push( {x: parseFloat(crp[ i ]), y: parseFloat(crp[ i + 1 ])} );
      p.push( {x: parseFloat(crp[ i ]), y: parseFloat(crp[ i + 1 ])} );
      p.push( {x: parseFloat(crp[ i + 2 ]), y: parseFloat(crp[ i + 3 ])} );
      p.push( {x: parseFloat(crp[ i + 4 ]), y: parseFloat(crp[ i + 5 ])} );
    } else if ( iLen - 4 == i ) {
      p.push( {x: parseFloat(crp[ i - 2 ]), y: parseFloat(crp[ i - 1 ])} );
      p.push( {x: parseFloat(crp[ i ]), y: parseFloat(crp[ i + 1 ])} );
      p.push( {x: parseFloat(crp[ i + 2 ]), y: parseFloat(crp[ i + 3 ])} );
      p.push( {x: parseFloat(crp[ i + 2 ]), y: parseFloat(crp[ i + 3 ])} );
    } else {
      p.push( {x: parseFloat(crp[ i - 2 ]), y: parseFloat(crp[ i - 1 ])} );
      p.push( {x: parseFloat(crp[ i ]), y: parseFloat(crp[ i + 1 ])} );
      p.push( {x: parseFloat(crp[ i + 2 ]), y: parseFloat(crp[ i + 3 ])} );
      p.push( {x: parseFloat(crp[ i + 4 ]), y: parseFloat(crp[ i + 5 ])} );
    }

    // Catmull-Rom to Cubic Bezier conversion matrix
    //    0       1       0       0
    //  -1/6      1      1/6      0
    //    0      1/6      1     -1/6
    //    0       0       1       0

    var bp = [];
    var tension = t || 8; // tension=2 <=> 1/2=0.5 tension as ZERO
    bp.push( { x: p[1].x,  y: p[1].y } );
    bp.push( { x: ((-p[0].x + tension*p[1].x + p[2].x) / tension), y: ((-p[0].y + tension*p[1].y + p[2].y) / tension)} );
    bp.push( { x: ((p[1].x + tension*p[2].x - p[3].x) / tension),  y: ((p[1].y + tension*p[2].y - p[3].y) / tension) } );
    bp.push( { x: p[2].x,  y: p[2].y } );

    d += "C" + bp[1].x + "," + bp[1].y + " " + bp[2].x + "," + bp[2].y + " " + bp[3].x + "," + bp[3].y + " ";
  }

  return d;
}



/*!	Curve calc function for canvas 2.3.1
 *	Epistemex (c) 2013-2014
 *	License: MIT
 */

/**
 * Calculates an array containing points representing a cardinal spline through given point array.
 * Points must be arranged as: [x1, y1, x2, y2, ..., xn, yn].
 *
 * The points for the cardinal spline are returned as a new array.
 *
 * @param {Array} points - point array
 * @param {Number} [tension=0.5] - tension. Typically between [0.0, 1.0] but can be exceeded
 * @param {Number} [numOfSeg=20] - number of segments between two points (line resolution)
 * @param {Boolean} [close=false] - Close the ends making the line continuous
 * @returns {Float32Array} New array with the calculated points that was added to the path
 */
function getCurvePoints(points, tension, numOfSeg, close) {

	'use strict';

	// options or defaults
	tension = (typeof tension === 'number') ? tension : 0.5;
	numOfSeg = numOfSeg ? numOfSeg : 2;

	var pts,									// for cloning point array
		i = 1,
		l = points.length,
		rPos = 0,
		rLen = (l-2) * numOfSeg + 2 + (close ? 2 * numOfSeg: 0),
		res = new Float32Array(rLen),
		cache = new Float32Array((numOfSeg + 2) * 4),
		cachePtr = 4;

	pts = points.slice(0);

	if (close) {
		pts.unshift(points[l - 1]);				// insert end point as first point
		pts.unshift(points[l - 2]);
		pts.push(points[0], points[1]); 		// first point as last point
	}
	else {
		pts.unshift(points[1]);					// copy 1. point and insert at beginning
		pts.unshift(points[0]);
		pts.push(points[l - 2], points[l - 1]);	// duplicate end-points
	}

	// cache inner-loop calculations as they are based on t alone
	cache[0] = 1;								// 1,0,0,0

	for (; i < numOfSeg; i++) {

		var st = i / numOfSeg,
			st2 = st * st,
			st3 = st2 * st,
			st23 = st3 * 2,
			st32 = st2 * 3;

		cache[cachePtr++] =	st23 - st32 + 1;	// c1
		cache[cachePtr++] =	st32 - st23;		// c2
		cache[cachePtr++] =	st3 - 2 * st2 + st;	// c3
		cache[cachePtr++] =	st3 - st2;			// c4
	}

	cache[++cachePtr] = 1;						// 0,1,0,0

	// calc. points
	parse(pts, cache, l);

	if (close) {
		//l = points.length;
		pts = [];
		pts.push(points[l - 4], points[l - 3], points[l - 2], points[l - 1]); // second last and last
		pts.push(points[0], points[1], points[2], points[3]); // first and second
		parse(pts, cache, 4);
	}

	function parse(pts, cache, l) {

		for (var i = 2, t; i < l; i += 2) {

			var pt1 = pts[i],
				pt2 = pts[i+1],
				pt3 = pts[i+2],
				pt4 = pts[i+3],

				t1x = (pt3 - pts[i-2]) * tension,
				t1y = (pt4 - pts[i-1]) * tension,
				t2x = (pts[i+4] - pt1) * tension,
				t2y = (pts[i+5] - pt2) * tension;

			for (t = 0; t < numOfSeg; t++) {

				var c = t << 2, //t * 4;

					c1 = cache[c],
					c2 = cache[c+1],
					c3 = cache[c+2],
					c4 = cache[c+3];

				res[rPos++] = c1 * pt1 + c2 * pt3 + c3 * t1x + c4 * t2x;
				res[rPos++] = c1 * pt2 + c2 * pt4 + c3 * t1y + c4 * t2y;
			}
		}
	}

	// add last point
	l = close ? 0 : points.length - 2;
	res[rPos++] = points[l];
	res[rPos] = points[l+1];

	return res;
}



