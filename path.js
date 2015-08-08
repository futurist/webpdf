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

 
function eve(el, type){
    el= ('jquery' in el)? el.get(0) : el ;  //(typeof el['jquery']!='undefined')
    if(typeof type=='undefined') type='click';
    var click = document.createEvent("MouseEvents");
    click.initMouseEvent(type, true, true, window,
                         0, 0, 0, 0, 0, false, false, false, false, 0, null);
    button = el;
    button.dispatchEvent(click);
    button.focus();
}


function $$(sel){ return document.querySelector(sel); }

function wait(condition, passfunc, failfunc){
    var _inter = setInterval(function(){
        if( eval(condition) ){
            clearInterval(_inter);
            passfunc.call();
        }else{
            if(failfunc) failfunc.call();
        }
    },300);
}


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



//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  var zepto = $.zepto, oldQsa = zepto.qsa, oldMatches = zepto.matches

  function visible(elem){
    elem = $(elem)
    return !!(elem.width() || elem.height()) && elem.css("display") !== "none"
  }

  // Implements a subset from:
  // http://api.jquery.com/category/selectors/jquery-selector-extensions/
  //
  // Each filter function receives the current index, all nodes in the
  // considered set, and a value if there were parentheses. The value
  // of `this` is the node currently being considered. The function returns the
  // resulting node(s), null, or undefined.
  //
  // Complex selectors are not supported:
  //   li:has(label:contains("foo")) + li:has(label:contains("bar"))
  //   ul.inner:first > li
  var filters = $.expr[':'] = {
    visible:  function(){ if (visible(this)) return this },
    hidden:   function(){ if (!visible(this)) return this },
    selected: function(){ if (this.selected) return this },
    checked:  function(){ if (this.checked) return this },
    parent:   function(){ return this.parentNode },
    first:    function(idx){ if (idx === 0) return this },
    last:     function(idx, nodes){ if (idx === nodes.length - 1) return this },
    eq:       function(idx, _, value){ if (idx === value) return this },
    contains: function(idx, _, text){ if ($(this).text().indexOf(text) > -1) return this },
    has:      function(idx, _, sel){ if (zepto.qsa(this, sel).length) return this }
  }

  var filterRe = new RegExp('(.*):(\\w+)(?:\\(([^)]+)\\))?$\\s*'),
      childRe  = /^\s*>/,
      classTag = 'Zepto' + (+new Date())

  function process(sel, fn) {
    // quote the hash in `a[href^=#]` expression
    sel = sel.replace(/=#\]/g, '="#"]')
    var filter, arg, match = filterRe.exec(sel)
    if (match && match[2] in filters) {
      filter = filters[match[2]], arg = match[3]
      sel = match[1]
      if (arg) {
        var num = Number(arg)
        if (isNaN(num)) arg = arg.replace(/^["']|["']$/g, '')
        else arg = num
      }
    }
    return fn(sel, filter, arg)
  }

  zepto.qsa = function(node, selector) {
    return process(selector, function(sel, filter, arg){
      try {
        var taggedParent
        if (!sel && filter) sel = '*'
        else if (childRe.test(sel))
          // support "> *" child queries by tagging the parent node with a
          // unique class and prepending that classname onto the selector
          taggedParent = $(node).addClass(classTag), sel = '.'+classTag+' '+sel

        var nodes = oldQsa(node, sel)
      } catch(e) {
        console.error('error performing selector: %o', selector)
        throw e
      } finally {
        if (taggedParent) taggedParent.removeClass(classTag)
      }
      return !filter ? nodes :
        zepto.uniq($.map(nodes, function(n, i){ return filter.call(n, i, nodes, arg) }))
    })
  }

  zepto.matches = function(node, selector){
    return process(selector, function(sel, filter, arg){
      return (!sel || oldMatches(node, sel)) &&
        (!filter || filter.call(node, null, arg) === node)
    })
  }
})(Zepto);











(function(window,undefined){
  '$:nomunge'; // Used by YUI compressor.
  
  var $ = window.jQuery || window.Cowboy || ( window.Cowboy = {} ),
    
    // Internal method reference.
    jq_throttle;
  
  // Method: jQuery.throttle
  // Usage:
  // 
  // > var throttled = jQuery.throttle( delay, [ no_trailing, ] callback );
  // > 
  // > jQuery('selector').bind( 'someevent', throttled );
  // > jQuery('selector').unbind( 'someevent', throttled );
  // 
  // This also works in jQuery 1.4+:
  // 
  // > jQuery('selector').bind( 'someevent', jQuery.throttle( delay, [ no_trailing, ] callback ) );
  // > jQuery('selector').unbind( 'someevent', callback );
  // 
  // Arguments:
  // 
  //  delay - (Number) A zero-or-greater delay in milliseconds. For event
  //    callbacks, values around 100 or 250 (or even higher) are most useful.
  //  no_trailing - (Boolean) Optional, defaults to false. If no_trailing is
  //    true, callback will only execute every `delay` milliseconds while the
  //    throttled-function is being called. If no_trailing is false or
  //    unspecified, callback will be executed one final time after the last
  //    throttled-function call. (After the throttled-function has not been
  //    called for `delay` milliseconds, the internal counter is reset)
  //  callback - (Function) A function to be executed after delay milliseconds.
  //    The `this` context and all arguments are passed through, as-is, to
  //    `callback` when the throttled-function is executed.
  // 
  // Returns:
  // 
  //  (Function) A new, throttled, function.
  
  $.throttle = jq_throttle = function( delay, no_trailing, callback, debounce_mode ) {

    var timeout_id,
      
      // Keep track of the last time `callback` was executed.
      last_exec = 0;
    
    // `no_trailing` defaults to falsy.
    if ( typeof no_trailing !== 'boolean' ) {
      debounce_mode = callback;
      callback = no_trailing;
      no_trailing = undefined;
    }

    function wrapper() {
      var that = this,
        elapsed = +new Date() - last_exec,
        args = arguments;
      
      // Execute `callback` and update the `last_exec` timestamp.
      function exec() {
        last_exec = +new Date();
        callback.apply( that, args );
      };
      
      // If `debounce_mode` is true (at_begin) this is used to clear the flag
      // to allow future `callback` executions.
      function clear() {
        timeout_id = undefined;
      };
      
      if ( debounce_mode && !timeout_id ) {
        // Since `wrapper` is being called for the first time and
        // `debounce_mode` is true (at_begin), execute `callback`.
        exec();
      }
      
      // Clear any existing timeout.
      timeout_id && clearTimeout( timeout_id );
      
      if ( debounce_mode === undefined && elapsed > delay ) {

        exec();
        
      } else if ( no_trailing !== true ) {

        timeout_id = setTimeout( debounce_mode ? clear : exec, debounce_mode === undefined ? delay - elapsed : delay );
      }
    };

    if ( $.guid ) {
      wrapper.guid = callback.guid = callback.guid || $.guid++;
    }
    
    // Return the wrapper function.
    return wrapper;
  };
  
  // Method: jQuery.debounce

  // Usage:
  // 
  // > var debounced = jQuery.debounce( delay, [ at_begin, ] callback );
  // > 
  // > jQuery('selector').bind( 'someevent', debounced );
  // > jQuery('selector').unbind( 'someevent', debounced );
  // 
  // This also works in jQuery 1.4+:
  // 
  // > jQuery('selector').bind( 'someevent', jQuery.debounce( delay, [ at_begin, ] callback ) );
  // > jQuery('selector').unbind( 'someevent', callback );
  // 
  // Arguments:
  // 
  //  delay - (Number) A zero-or-greater delay in milliseconds. For event
  //    callbacks, values around 100 or 250 (or even higher) are most useful.
  //  at_begin - (Boolean) Optional, defaults to false. If at_begin is false or
  //    unspecified, callback will only be executed `delay` milliseconds after
  //    the last debounced-function call. If at_begin is true, callback will be
  //    executed only at the first debounced-function call. (After the
  //    throttled-function has not been called for `delay` milliseconds, the
  //    internal counter is reset)
  //  callback - (Function) A function to be executed after delay milliseconds.
  //    The `this` context and all arguments are passed through, as-is, to
  //    `callback` when the debounced-function is executed.
  // 
  // Returns:
  // 
  //  (Function) A new, debounced, function.
  
  $.debounce = function( delay, at_begin, callback ) {
    return callback === undefined
      ? jq_throttle( delay, at_begin, false )
      : jq_throttle( delay, callback, at_begin !== false );
  };
  
})(this);



(function ($) {
    // Monkey patch jQuery 1.3.1+ css() method to support CSS 'transform'
    // property uniformly across Safari/Chrome/Webkit, Firefox 3.5+, IE 9+, and Opera 11+.
    // 2009-2011 Zachary Johnson www.zachstronaut.com
    // Updated 2011.05.04 (May the fourth be with you!)
    function getTransformProperty(element)
    {
        // Try transform first for forward compatibility
        // In some versions of IE9, it is critical for msTransform to be in
        // this list before MozTranform.
        var properties = ['transform', 'WebkitTransform', 'msTransform', 'MozTransform', 'OTransform'];
        var p;
        while (p = properties.shift())
        {
            if (typeof element.style[p] != 'undefined')
            {
                return p;
            }
        }
        
        // Default to transform also
        return 'transform';
    }
    
    var _propsObj = null;
    
    var proxied = $.fn.css;
    $.fn.css = function (arg, val)
    {
        // Temporary solution for current 1.6.x incompatibility, while
        // preserving 1.3.x compatibility, until I can rewrite using CSS Hooks
        if (_propsObj === null)
        {
            if (typeof $.cssProps != 'undefined')
            {
                _propsObj = $.cssProps;
            }
            else if (typeof $.props != 'undefined')
            {
                _propsObj = $.props;
            }
            else
            {
                _propsObj = {}
            }
        }
        
        // Find the correct browser specific property and setup the mapping using
        // $.props which is used internally by jQuery.attr() when setting CSS
        // properties via either the css(name, value) or css(properties) method.
        // The problem with doing this once outside of css() method is that you
        // need a DOM node to find the right CSS property, and there is some risk
        // that somebody would call the css() method before body has loaded or any
        // DOM-is-ready events have fired.
        if
        (
            typeof _propsObj['transform'] == 'undefined'
            &&
            (
                arg == 'transform'
                ||
                (
                    typeof arg == 'object'
                    && typeof arg['transform'] != 'undefined'
                )
            )
        )
        {
            _propsObj['transform'] = getTransformProperty(this.get(0));
        }
        
        // We force the property mapping here because jQuery.attr() does
        // property mapping with jQuery.props when setting a CSS property,
        // but curCSS() does *not* do property mapping when *getting* a
        // CSS property.  (It probably should since it manually does it
        // for 'float' now anyway... but that'd require more testing.)
        //
        // But, only do the forced mapping if the correct CSS property
        // is not 'transform' and is something else.
        if (_propsObj['transform'] != 'transform')
        {
            // Call in form of css('transform' ...)
            if (arg == 'transform')
            {
                arg = _propsObj['transform'];
                
                // User wants to GET the transform CSS, and in jQuery 1.4.3
                // calls to css() for transforms return a matrix rather than
                // the actual string specified by the user... avoid that
                // behavior and return the string by calling jQuery.style()
                // directly
                if (typeof val == 'undefined' && jQuery.style)
                {
                    return jQuery.style(this.get(0), arg);
                }
            }

            // Call in form of css({'transform': ...})
            else if
            (
                typeof arg == 'object'
                && typeof arg['transform'] != 'undefined'
            )
            {
                arg[_propsObj['transform']] = arg['transform'];
                delete arg['transform'];
            }
        }
        
        return proxied.apply(this, arguments);
    };
})(Zepto||jQuery);








;(function($, window, undefined) {
  /**
   * @description 触摸事件
   * @param {HTMLElement} [options.element = document] 需添加touch事件的节点，默认为document
   * @param {HTMLElement} [options.targetSelector] 需要做事件委托处理时，通过targetSelector传需要添加事件的节点
   * @param {Function} [options.startCallback = function(){}] touchstart事件的回调函数
   * @param {Function} [options.moveCallback = function(){}] touchmove事件的回调函数
   * @param {Function} [options.endCallback = function(){}] touchend事件的回调函数
   * @param {[Boolean]} options.debug 是否开启debug模式，默认为不开启
   * @return {[null]}
   * @example
   *  // 企业列表、证据、材料
      var touchEvent = new $.TouchEvent({
        targetSelector: '#searchCorpListTouch, #ajaxContent_getCorpEvList, #ajaxContent_getCorpFileList',
        endCallback: function(){
          var _this = this;
          // 找出当前页
          var $currentPage = $('.pAjax span.current');
          var $prevPage = $currentPage.prev();
          var $nextPage = $currentPage.next();

          if($currentPage.length){
            if (_this.endY - _this.startY > 100) { // 往下拉
              if ($prevPage.length) { // 出来上一页的数据
                $prevPage.trigger('click');
              }
            }

            if (_this.endY - _this.startY < -100) { // 往上拉
              if ($nextPage.length) { // 出来下一页的数据
                $nextPage.trigger('click');
              }
            }
          }
        }
      });
   */
  "use strict";
  var TouchEvent = function(options) {
    var _this = this;
    // 定义静态属性
    _this.opts = options;
    _this.element = options.element || document;
    _this.targetSelector = options.targetSelector;

    _this.startCallback = options.startCallback || function() {};
    _this.moveCallback = options.moveCallback || function() {};
    _this.endCallback = options.endCallback || function() {};

    // 定义静态属性，相对touchListener方法为全局
    _this.startX = 0;
    _this.startY = 0;
    _this.moveX = 0;
    _this.moveY = 0;
    _this.endX = 0;
    _this.endY = 0;

    // 定义静态属性，相对touchListener方法为全局
    _this.startX2 = 0;
    _this.startY2 = 0;
    _this.moveX2 = 0;
    _this.moveY2 = 0;
    _this.endX2 = 0;
    _this.endY2 = 0;
    
    _this.startDist = 0;
    _this.endDist = 0;
    _this.moveDist = 0;

    _this.touches = 0;
    _this.changedTouches = 0;

    // 是否开启debug模式，默认为不开启
    _this.debug = options.debug;

    // 检测Function是否有bind方法，若无，则扩展
    _this.bind();

    _this.init();
  };

  TouchEvent.prototype = {
    constructor: TouchEvent,
    init: function() {
      var _this = this;

      // 注册事件，并把时间的this对象换成_this
      _this.element.addEventListener('touchstart', _this.touchListener.bind(_this), false);
      _this.element.addEventListener('touchmove', _this.touchListener.bind(_this), false);
      _this.element.addEventListener('touchend', _this.touchListener.bind(_this), false);
    },
    touchListener: function(event) {
      var _this = this;
      if (_this.targetSelector && _this.getChildrenAndSelf($(_this.targetSelector)).indexOf(event.target) === -1) { // 处理事件委托
        return false;
      }
      switch (event.type) { // 根据触摸过程中的不同事件类型，做不同的处理
        case "touchstart":
          // 取得当前坐标
          _this.startX = event.touches[0].clientX;
          _this.startY = event.touches[0].clientY;
          _this.touches = event.touches.length;

          if(_this.touches>1){
            _this.startX2 = event.touches[1].clientX;
            _this.startY2 = event.touches[1].clientY;
            _this.startDist = Math.sqrt( Math.pow(_this.moveX-_this.startX2, 2),  Math.pow(_this.moveY-_this.startY2, 2) );
          }

          // 触摸开始，触发回调
          _this.startCallback.call(_this, event);
          break;

        case "touchend":
          // 取得当前坐标
          _this.endX = event.changedTouches[0].clientX;
          _this.endY = event.changedTouches[0].clientY;
          _this.changedTouches = event.changedTouches.length;
          _this.touches = event.touches.length;

          if(_this.changedTouches && _this.touches) {
            var endX = event.touches[0].clientX;
            var endY = event.touches[0].clientY;
            _this.endX2 = event.changedTouches[0].clientX;
            _this.endY2 = event.changedTouches[0].clientY;
            _this.endDist = Math.sqrt( Math.pow(endX-_this.endX2, 2),  Math.pow(endY-_this.endY2, 2) );
          }

          // 停止触摸时的回调函数
          _this.endCallback.call(_this, event);

          break;

        case "touchmove":
          // 移动的时候阻止默认事件
          if(_this.touches>1) event.preventDefault();

          // 取得当前坐标
          _this.moveX = event.touches[0].clientX;
          _this.moveY = event.touches[0].clientY;
          
          _this.touches = event.touches.length;

          if(_this.touches>1){
            _this.moveX2 = event.touches[1].clientX;
            _this.moveY2 = event.touches[1].clientY;
            _this.moveDist = Math.sqrt( Math.pow(_this.moveX-_this.moveX2, 2),  Math.pow(_this.moveY-_this.moveY2, 2) );
          }

          // 停止触摸时的回调函数
          _this.moveCallback.call(_this, event);

          break;
      }
    },
    getChildrenAndSelf: function(element) { // 找出节点下的所有节点数组
      var arr = [];
      var $elements = $(element);
      $elements.each(function() {
        var children = this.getElementsByTagName('*');
        for (var i = children.length - 1; i >= 0; i--) {
          arr.push(children[i]);
        }
        arr.push(this)
      });
      return arr;
    },
    bind: function() { // 若原生不支持bind方法，则扩展
      if (!Function.prototype.bind) {
        Function.prototype.bind = function(obj) {
          if (arguments.length < 2 && !arguments[0]) {
            return this;
          }
          var fn = this,
            slice = Array.prototype.slice,
            args = slice.call(arguments, 1);
          // 返回一function，以obj为this，bind中传入的参数加上当前function中参数为参数
          return function() {
            // 后面继续连上arguments，给返回的function传入参数
            return fn.apply(obj, args.concat(slice.call(arguments)))
          }
        }
      }
    },
    console: function(msg) { // 输出错误信息到错误控制台
      var _this = this;
      if (window.console && _this.debug) {
        console.error(msg);
      }
    }
  };
  // 注入到jQuery这一namespace下
  $.TouchEvent = TouchEvent;
})(Zepto||jQuery, window);


