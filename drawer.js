
/****
* in viewer.js File, line 3555, add This line to join:
* function PDFPageView(options) {
*   LINE 3555:   this.drawView = new DrawView(options, this);
*
* reset: function PDFPageView_reset(keepAnnotations) {
*   LINE 3588:  this.drawView.reset();
*
*/
var DrawView  = (function () {


  function DrawView (options, pageView) {
    this.pageView = pageView;
    var container = options.container;
    var id = options.id;
    var scale = options.scale;
    var defaultViewport = options.defaultViewport;

    this.id = id;
    this.container = container;


    this.rotation = 0;
    this.scale = scale || 1.0;
    this.viewport = defaultViewport;

    this.resume = null;

    this.onBeforeDraw = null;
    this.onAfterDraw = null;

    this.textLayer = null;

    this.zoomLayer = null;

    this.annotationLayer = null;

    var div = document.createElement('div');
    div.id = 'drawerLayer' + this.id;
    div.className = 'page drawerLayer';
    div.style.width = Math.floor(this.viewport.width) + 'px';
    div.style.height = Math.floor(this.viewport.height) + 'px';
    div.setAttribute('data-page-number', this.id);
    this.div = div;

    var $drawCon = $(container).next().size()
              ? $(container).next()
              : $('<div id="drawViewer" class="drawViewer">').appendTo( $(container).parent() );

    $drawCon.append(div);

    window.viewBox = pageView.viewport.viewBox;


    var $drawerLayer = $(this.div);

    var str = '<div class="svgCon" style="padding-top:0px;"> <svg viewBox="0 0 {{width}} {{height}}" preserveAspectRatio="xMidYMid meet" class="canvas" xmlns="http://www.w3.org/2000/svg" version="1.1"> <defs> <marker id="triangle" preserveAspectRatio="xMinYMin meet"viewBox="0 0 100 100" refX="50" refY="50"markerUnits="userSpaceOnUse"stroke="#f00"fill="#f00"stroke-linecap="round"stroke-width="10"stroke-linejoin="bevel"markerWidth="40" markerHeight="30"orient="auto"> <path d="M 0 0 L 100 50 L 0 100 L 30 50 z" /> </marker> </defs> <rect class="selrect" style="display:none; stroke:#999; stroke-width:1; stroke-dasharray:10,5; fill:none;" /> </svg> </div> <div class="textCon" class="canvas"> </div>';
    str = str.replace('{{width}}', viewBox[2]).replace('{{height}}', viewBox[3]);

    $drawerLayer.empty().append(str).data('page-number', this.id);

    pageView.drawerLayer = $drawerLayer.get(0);
    window.pdfViewer = PDFViewerApplication.pdfViewer;

    init( $drawerLayer );

  }

  DrawView.prototype = {

    destroy: function () {
      this.zoomLayer = null;
      this.reset();
    },

    reset: function () {

      var scale = this.pageView.viewport.scale;
      var rotation = this.pageView.viewport.rotation;
      var div = this.div;
      div.style.width = Math.floor(this.pageView.viewport.width) + 'px';
      div.style.height = Math.floor(this.pageView.viewport.height) + 'px';
    },

    update: function (scale, rotation) {



    },
    updatePosition: function () {

    },

    cssTransform: function (transform) {
      // Scale canvas, canvas wrapper, and page container.
      var div = this.div;
      div.style.width = Math.floor(this.pageView.viewport.width) + 'px';
      div.style.height = Math.floor(this.pageView.viewport.height) + 'px';
      console.log('cssTransform');
    },

    get width() {
      return this.viewport.width;
    },

    get height() {
      return this.viewport.height;
    },

    getPagePoint: function (x, y) {
      return this.viewport.convertToPdfPoint(x, y);
    },

    draw: function () {

    }

  }

  return DrawView;
})();


window.addEventListener('scalechange', function scalechange(evt) {

  $('.textCon').hide();

});

document.addEventListener('pagerendered', function (e) {
  var pageIndex = e.detail.pageNumber - 1;
  var pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);
  var oldRotation = window.curRotation||0;
  window.curScale = pageView.viewport.scale;
  window.curRotation = pageView.viewport.rotation;
  window.viewBox = pageView.viewport.viewBox;
  var W = viewBox[2];
  var H = viewBox[3];
  //$('svg.canvas *').css({'transform-origin':'0% 0%', 'transform': 'rotate('+curRotation+'deg)' }).show();


  //text tranlation with rotation

  if(curRotation == 0){
    $('.textCon').show().css({'transform': 'scale('+curScale+')' });
  }
  if(curRotation == 90){
    $('.textCon').show().css({'transform': 'scale('+curScale+') rotate(90deg) translate(0,-'+ H +'px)' });
  }
  if(curRotation == 180){
    $('.textCon').show().css({'transform': 'scale('+curScale+') rotate(180deg) translate(-'+ W +'px,-'+ H +'px)' });
  }
  if(curRotation == 270){
    $('.textCon').show().css({'transform': 'scale('+curScale+') rotate(270deg) translate(-'+ W +'px,-'+ 0 +'px)' });
  }

  //change direction
  if(curRotation == oldRotation) return;

  //svg translation with rotation

  var rotClock =  (curRotation==0&&oldRotation==270) ? true :  ( (curRotation==270&&oldRotation==0) ? false :  (curRotation - oldRotation > 0) );

  if(curRotation == 0) {
    $('svg.canvas').attr('viewBox', '0 0 '+W+' '+H);
  }
  if(curRotation == 90){
    $('svg.canvas').attr('viewBox', '0 0 '+H+' '+W);
    //$('svg.canvas rect').attr('transform', 'matrix(0,1,1,0,0,0)');
  }
  if(curRotation == 180){
    $('svg.canvas').attr('viewBox', '0 0 '+W+' '+H);
  }
  if(curRotation == 270){
    $('svg.canvas').attr('viewBox', '0 0 '+H+' '+W);
  }

  var box = $('svg.canvas').attr('viewBox').split(/\s+/g).map(function(v){return parseInt(v)});
  var bw = box[2];
  var bh = box[3];

  var p = $('.svgCon').parent();
  $('.svgCon').width( p.width() );
  $('.svgCon').height( p.height() );


  /*****
  * For SVG Shape, we redraw all the shape according to the rotation.
  * For text, we rotate all the shape.
  */
  $('[data-hl]').attr('data-hl',null);

  var oldShapes = $('svg.canvas .shape').toArray();
  var oldShapeIDs = oldShapes.map( function(v){ return $(v).data('id'); } );
  oldShapes.forEach(function(v){
    rotateShape(v, rotClock? 90:-90 );
  });

  oldShapeIDs.forEach(function  (v) {
    $('[data-id="'+ v +'"]').remove();
  });


  $('[data-hl]').attr('data-hl',null);

  return;

  var box = $('svg.canvas').attr('viewBox').split(/\s+/g).map(function(v){return parseInt(v)});
  var bw = box[2];
  var bh = box[3];

    $('svg.canvas .shape').each(function(i,v){
      var trans = getTranslateXY(v);
      var oldRotation = getRotation(v);
      var newRotate = ( oldRotation + (rotClock?90:-90) + 3600 ) % 360;

      switch(newRotate) {
        case 0: rotClock ? trans[0]+=bw : trans[1]+= bh; break;
        case 90: rotClock ? trans[1]+=-bw : trans[0]+= bh; break;
        case 180: rotClock ? trans[0]+=-bw : trans[1]+= -bh; break;
        case 270: rotClock ? trans[1]+=bw : trans[0]+= -bh; break;
      }

      $(v).attr('transform', 'rotate('+newRotate+') translate('+(trans[0])+','+(trans[1])+')');
      updateBBox(v);

    });


});

function getViewPortWH () {
  var box = $('svg.canvas').attr('viewBox').split(/\s+/g).map(function(v){return parseInt(v)});
  var bw = box[2];
  var bh = box[3];
  return {bw:bw, bh:bh};
}

function rotatePoint(p, rotate){

  var box = $('svg.canvas').attr('viewBox').split(/\s+/g).map(function(v){return parseInt(v)});
  var bw = box[2];
  var bh = box[3];

  if(!rotate) rotate = curRotation;

  var v1 = new Victor.fromArray(p).subtract( rotate>0 ? new Victor( 0, bw) : new Victor( bh, 0) ); //.add(new Victor(trans[0], trans[1]) );
  var newV1 = v1.rotateDeg(rotate);
  return newV1.toArray();
}

function rotateTextPoint(p, rotate){

  var box = $('svg.canvas').attr('viewBox').split(/\s+/g).map(function(v){return parseInt(v)});
  var bw = box[2];
  var bh = box[3];

  if(!rotate) rotate = curRotation;
  if(rotate==0){
    return [p[0], p[1]];
  }
  if(rotate==90){
    return [ p[1], bw - p[0] ];
  }
  if(rotate==180){
    return [ bw-p[0], bh - p[1] ];
  }
  if(rotate==270){
    return [ bh-p[1], p[0] ];
  }

}



function rotateShape(v, rotate){

  $('circle').remove();

  var tool = $(v).data('tool');
  var path = $(v).data('path');

  var bbox = $(v).data('bbox');
  var startpoint =tool=='text'?bbox[0] : $(v).data('startpoint');
  var endpoint =tool=='text'?bbox[1] : $(v).data('endpoint');
  var options = $(v).data('options');

  var trans = getTranslateXY(v);

  if(startpoint){
    startpoint[0] += trans[0];
    startpoint[1] += trans[1];
    startpoint = rotatePoint(startpoint, rotate);
  }
  if(endpoint){
    endpoint[0] += trans[0];
    endpoint[1] += trans[1];
    endpoint = rotatePoint(endpoint, rotate);
  }



  // $(v).closest('svg.canvas').append( makeShape("circle", { cx:newV1.x, cy:newV1.y, r:5, fill:"rgba(255,0,255,1)" }) );
  // $(v).closest('svg.canvas').append( makeShape("circle", { cx:newV2.x, cy:newV2.y, r:5, fill:"rgba(255,0,255,1)" }) );

  if(tool == 'rect'){
    createRect(startpoint, endpoint, null, options);
  }
  if(tool == 'circle'){
    createCircle(startpoint, endpoint, null, options);
  }
  if(tool == 'line'){
    createLine(startpoint, endpoint, null, options);
  }
  if(tool == 'curve'){

    var newPath = [];
    path.forEach(function  (pt) {
      newPath.push( rotatePoint(pt, rotate) );
    });

    createPath(newPath, null, options);
  }


}




function updateBBox(v){
  var box = $(v).closest('svg.canvas').attr('viewBox').split(/\s+/g).map(function(v){return parseInt(v)});
  var bw = box[2];
  var bh = box[3];

  var bbox = $(v).data('bbox');

  var trans = getTranslateXY(v);
  var rotate = getRotation(v);

  var v1 = new Victor.fromArray(bbox[0]).subtract(new Victor( 0, bw) ); //.add(new Victor(trans[0], trans[1]) );
  var v2 = new Victor.fromArray(bbox[1]).subtract(new Victor( 0, bw) ); //.add(new Victor(trans[0], trans[1]) );

  var newV1 = v1.rotateDeg(rotate);
  var newV2 = v2.rotateDeg(rotate);

  // $(v).closest('svg.canvas').append( makeShape("circle", { cx:newV1.x, cy:newV1.y, r:5, fill:"rgba(255,0,255,1)" }) );
  // $(v).closest('svg.canvas').append( makeShape("circle", { cx:newV2.x, cy:newV2.y, r:5, fill:"rgba(255,0,255,1)" }) );

  $(v).data('bbox', JSON.stringify( [[newV1.x, newV1.y], [newV2.x, newV2.y]] ) );
}




function getRotation (obj) {
  if(!obj) return [0,0];
   if(obj.size) obj=obj.get(0);
    var style = obj.style;
    var transform = style.transform || style.webkitTransform || style.mozTransform;
    var transformAttr =obj.getAttribute('transform');
    transform = (!transformAttr) ? transform :  transformAttr;
    if(!transform ) return 0;
  var zT = transform.match(/rotate\(\s*([0-9.-]+)\s*\)/);
    return zT ? parseInt(zT[1]) : 0;
}

function getRotateTranslate (obj, x,y) {
  var rotate;
  if(obj)
    rotate = getRotation(obj);
  else
    rotate = curRotation;

  if(rotate == 0) {
    return [x,y];
  }
  if(rotate == 90){
    return [y,-x];
  }
  if(rotate == 180){
    return [-x,-y];
  }
  if(rotate == 270){
    return [-y,x];
  }
  return [x,y];
}

document.addEventListener('textlayerrendered', function (e) {
  var pageIndex = e.detail.pageNumber - 1;
  var pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);

}, true);



window.pdfViewer = null;

var PageObj = (function(){
  function Page (drawerLayer) {
    this.context = drawerLayer;
  };

  Page.prototype = {

    get context(){
      return this._context;
    },
    set context(val){
      var n = $(val).data('page-number');
      if(!n)return;
      this.number = n;
    },
    get curPageNumber(){
      return PDFViewerApplication.pdfViewer.currentPageNumber;
    },
    get number(){
      return this._number;
    },
    set number(num){
      var pageView = PDFViewerApplication.pdfViewer.getPageView(num-1);
      var val = pageView.drawerLayer;
      this._context = val.get ? val.get(0) : val;
      this._number = num;
      this.pageView = pageView;
      this.con = pageView.div;
    },
    sync : function sync_to_curpage () {

    }
  };

  return Page;
})();



$(window).on(
  'touchmove',
   function(e) {
    e.preventDefault();
  }
);


// init function
function init (context) {

  var pos = $('svg.canvas', context).offset();

  //$('.svgCon').css({ left:pos.left+'px', top:pos.top+'px' }).attr({width: pos.width+'px', height: pos.height+'px'});
  //$('.textCon').css({ left:pos.left+'px', top:pos.top+'px', width:0+'px', height:0+'px' });

  $('svg.canvas', context).data('id', NewID() );
  $('.svgCon', context).data('id', NewID() );
  $('.textCon', context).data('id', NewID() );


  svgHistory.update('init');

}
//init();
$(function  () {

  setTool('curve');

  startWindowEvent();

  $('button').on(downE, function  (e) {
    e.stopPropagation();
    var evt = /touch/.test(e.type) ? e.touches[0] : e;
    eval( $(evt.target).data('onclick') );
  } );


});




var svgns = "http://www.w3.org/2000/svg";
    var curShapeID = null;
    var d = "";
    var i = 0;
    var downX, downY, downTimer, prevTime=0;
    // Path of the points
    var rPath=[];

    var curPage = null;
    var curContext = null;
    var curScale = 1;

    //dot distance
    var DOT_DISTANCE=10;
    var DRAW_TOLERANCE=10;
    var drawing = false;
    var dragging = false;
    var selecting = false;

    // the current tool when user select
    var curTool = null;
    var prevEl = null;

    // whether it's touch screen
    var isTouch = ('ontouchstart' in window) || ('DocumentTouch' in window && document instanceof DocumentTouch);

    // touch event uniform to touchscreen & PC
    var downE = isTouch? 'touchstart' :'mousedown';
    var moveE = isTouch? 'touchmove' :'mousemove';
    var upE = isTouch? 'touchend' :'mouseup';
    var leaveE = isTouch? 'touchcancel' :'mouseleave';

    // the preset toolset
    var ToolSet = {
      curve:{
        "stroke-width": 2,
        "stroke":"#f00",
        "autoClose":0,
        "arrow":0,
      },
      line:{
        "stroke-width": 2,
        "stroke":"#f00",
        "autoClose":0,
        "highLight":false,
        "arrow":0,
      },
      rect:{
        "stroke-width": 2,
        "stroke":"#f00",
      },
      circle:{
        "stroke-width": 2,
        "stroke":"#f00",
      },
      text:{
        "font-family": "Arial",
        "stroke-width": 12,
        "stroke":"#f00",
      }
    }

    // generate new ID for the element
    function NewID () {
      return +new Date()+Math.random();
    }



    function exportCanvas () {
      var svg = document.querySelector('svg');
      var img = new Image();
      var canvas = document.querySelector('canvas');
      canvas.width = svg.offsetWidth;
      canvas.height = svg.offsetHeight;

      // get svg data
      var xml = new XMLSerializer().serializeToString(svg);
      console.log(xml);

      // make it base64
      var svg64 = btoa(xml);
      var b64Start = 'data:image/svg+xml;base64,';

      // prepend a "header"
      var image64 = b64Start + svg64;

      // set it as the source of the img element
      img.src = image64;

      // draw the image onto the canvas
      canvas.getContext('2d').drawImage(img, 0, 0);
      window.open( canvas.toDataURL() );
    }

    // get new options from selected options buttons
    /* The format:
    *  oldOptions: { "stroke-width":23, "stroke-color":"red" }
    *  setOptions: { "color":"red" }
    */
    function getOptions (oldOptions, setOptions) {
      // oldOptions parameter pass by ref

      //setOptions by value
      var options = $.extend({}, setOptions);

      var toggle = options.toggle;
      var set = options.set;
      var clear = options.clear;

      if( toggle ){
        if(toggle.arrow) oldOptions.arrow ^= toggle.arrow;  //bit flip
        if(toggle.highLight) oldOptions.highLight ^= toggle.highLight;  //bit flip
        if(toggle.autoClose){
          //for autoclose, we clear all other bit and flip only this bit
          oldOptions.autoClose = bit_check(oldOptions.autoClose, toggle.autoClose)?0:toggle.autoClose;
        }
        delete options.toggle;
      }

      var swidth = options['stroke-width'];
      if(swidth)
      {
        delete options['stroke-width'];
        if(swidth=='-') oldOptions['stroke-width'] -= 2;
        if(swidth=='+') oldOptions['stroke-width'] += 2;
      }

      var fontSize = options['font-size'];
      if(fontSize)
      {
        delete options['font-size'];
        if(fontSize=='-') oldOptions['font-size'] -= 2;
        if(fontSize=='+') oldOptions['font-size'] += 2;
      }
      oldOptions= $.extend(oldOptions, options );
      return true;

    }



    function setTool (tool, options) {

      if(!options) options={};

      curTool = tool;

      $('#drawTool .subtool').hide();
      $('#drawTool .subtool_'+tool).show();

      var shapeA = [];
      if( $('[data-hl]').size() ){
        shapeA = $('[data-hl]').toArray();
      }else {

        /*
          prevent remember last shape
        */
        //shapeA = $('[data-id="'+ curShapeID +'"]').toArray();
      }
        getOptions(ToolSet[tool], options );


      var isDirty = false;
      shapeA.forEach(function  (v) {
        var oldOptions = $(v).data('options');
        var newOptions = oldOptions ? ( oldOptions ) : ToolSet[tool];

        getOptions(newOptions, options );

        if( oldOptions == JSON.stringify(newOptions) ) return true;

        var isCommon = /stroke/.test( Object.keys(newOptions).join(',') );

        //if( tool!=v.dataset.tool ) return true;

        var path = $(v).data('path');
        var start = $(v).data('startpoint');
        var end = $(v).data('endpoint');
        var vTool =$(v).data('tool');

        if( path)
        if(vTool=='curve' ){
          var rPath = (path);
          createPath(rPath, v, newOptions);
        }

        if( start && end )
        if(vTool=='line' ){

          var startPoint = (start);
          var endPoint = (end);
          createLine(startPoint, endPoint, v, newOptions);

        }

        if( start && end )
        if(vTool=='rect' ){

          var startPoint = (start);
          var endPoint = (end);
          createRect(startPoint, endPoint, v, newOptions);

        }

        if( start && end )
        if(vTool=='circle' ){

          var startPoint = (start);
          var endPoint = (end);
          createCircle(startPoint, endPoint, v, newOptions);

        }

        if( start && end )
        if(vTool=='text' ){

          var startPoint = (start);
          var endPoint = (end);
          createText(startPoint, endPoint, v, newOptions);

        }


        isDirty = true;
      });
      if(isDirty) svgHistory.update();
    }



    NodeList.prototype.forEach = Array.prototype.forEach;

    //document.documentElement.style.webkitUserSelect='none';
    //document.documentElement.style.webkitTouchCallout='none';


    function startWindowEvent(){
      var win = $('#viewerContainer').get(0);
      win = window;
      win.addEventListener(moveE, moveFunc )
      win.addEventListener(downE, downFunc )
      win.addEventListener(upE, upFunc )
    }

    function endWindowEvent(){
      var win = $('#viewerContainer').get(0);
      win = window;
      win.removeEventListener(moveE, moveFunc )
      win.removeEventListener(downE, downFunc )
      win.removeEventListener(upE, upFunc )
    }


    function deleteEl (els) {
      if(els) els.remove();
      else{
        $('[data-hl]').remove();
      }
    }

    function calcDist (a,b) {
      return Math.sqrt( Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2) );
    }

    function makeShape(tag, attrs) {
        var el= document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs)
            el.setAttribute(k, attrs[k]);
        return el;
    }

    function  hideDot (hide) {
      // hide:undefined = toggle, hide:false = show, hide:true = hide;
      var c = document.querySelectorAll('circle.hint');
      for(var j=0;j<c.length; j++){
        if(typeof hide=='undefined') c[j].classList.toggle('hidden');
        if(hide==false) c[j].classList.remove('hidden');
        if(hide==true) c[j].classList.add('hidden');
      }
    }
    var debugID=0;
    function debug (str) {
      if(!str) str="";
      str+="";
      $('#debug').html( ++debugID +" "+ str.replace(/</g, '&lt;').replace(/>/g, '&gt;') );
    }

    function getElementsFromPoint (rectPoint) {
      var els = [];
      $('.shape, .textWrap').each( function  (i,v) {
        var _bb = $(v).data('bbox');
        var _trans = getTranslateXY(v);
        if(_bb && _trans){
          if( rectsIntersect2( rectPoint, _bb, _trans ) ){
            els.push(v);
          }
        }
      } );
      return els;
    }

    function beginDrag () {
       dragging = true;
      $('[data-hl]').each(function  (i,v) {
        $(v).attr('data-oldTrans', getTranslateXY(v).join(',') );
      });
    }


    function downFunc (e) {
      var evt = /touch/.test(e.type) ? e.touches[0] : e;
      var canvas = $(evt.target).closest('.drawerLayer')
      if(!canvas.size()) {
        curContext = null;
        return;
      }

      var isShape = $(evt.target).hasClass('shape');
      var isText = $(evt.target).closest('.textWrap').size()>0;

      var x = evt.pageX-$(canvas).offset().left;
      var y = evt.pageY-$(canvas).offset().top;

      if(0&&isText){
        var viewBW = getViewPortWH();
        var conPos = getOffsetXY(evt.pageX, evt.pageY, $('.textCon', canvas).get(0) , viewBW.bw, viewBW.bh );
        x=conPos.x;
        y=conPos.y;
      } else {
        x/=curScale;
        y/=curScale;        
      }

      downX = x;
      downY = y;
      clearTimeout(downTimer);

      var targetEl = isText? $(evt.target).closest('.textWrap') : evt.target;

      var context = $(canvas).closest('.drawerLayer').get(0);

      curContext = context;

      // targetEl = document.elementFromPoint(x,y);
      // isText = $(targetEl).closest('.textWrap').size()>0;
      // targetEl = isText? $(evt.target).closest('.textWrap') : evt.target;
      //FIX for iPad which cannot select TextElement
      var el =getElementsFromPoint( [[x,y],[x,y]] );
      if(el.length){
        //debug( x+" "+y+" "+ el[0].tagName + " "+ el.length  )
        targetEl = el.pop();
        isText = $(targetEl).closest('.textWrap').size()>0;
      }
      var isHandler = $(evt.target).hasClass('handler');


      if(isHandler){

        $('.handler').addClass('dragHandler');
        var oldsize = {width: parseInt( $('.textarea').css('width') ),  height: parseInt( $('.textarea').css('height') ) };
        $('.textarea').data('oldsize', JSON.stringify( oldsize ) );

        var oldpos = {left: parseInt($('.handler').css('left') ),  top: parseInt( $('.handler').css('top') ) };
        $('.handler').data( 'oldpos', JSON.stringify( oldpos ) );

        dragging = true;
        return;
      }


      if( $('.textarea').size() && !isText && !isHandler ) {
        onTextBlur();
      }

      if( $('.editing').size() ){
        return;
      }
      e.preventDefault();



      if( (e.shiftKey||e.ctrlKey) && (isShape||isText) && !drawing && !dragging  ) {
        var d = $(targetEl).data('hl');
        $(targetEl).data('hl', d?null:1);
        return;
      }


      //** DOUBLE CLICK event on canvas or element
      //******************************************

      if(e.timeStamp - prevTime<500 && prevEl && $(prevEl).data('id') == $(targetEl).data('id')  ){
        prevTime = 0;
        if( false && $(targetEl).is('svg.canvas') ) {
          selecting=true;
          $('svg.canvas',context).addClass('selectState');
        } else if(isShape) {
          $(targetEl).data('hl', 1);
          beginDrag();
        } else if(isText && !e.shiftKey) {
          textEditMode(targetEl);
        }
        prevEl = targetEl;
        return;
      }

      prevEl = targetEl;
      prevTime = e.timeStamp;

      // long click to trigger dragging mode && selecting mode
      if(!selecting && !dragging && !drawing )
      downTimer = window.setTimeout(function() {
        //we are longclick on shape
        if( isShape || isText ){

          addSelectionList( targetEl );
          beginDrag();

        }else{
          //we are longclick on SVG, selection mode
          downTimer = window.setTimeout(function() {
            selecting=true;
            $('svg.canvas',context).addClass('selectState');
          },300);
        }
      }, 0);

      if( $(targetEl).data('hl') ){

        beginDrag();

      } else {

        dragging = false;

        if(!e.shiftKey)
        $('[data-hl]').each(function(i,v){
          $(v).data('hl',null);
        });

      }

    }

    function moveFunc(e)
    {

      var evt = /touch/.test(e.type) ? e.touches[0] : e;

      var buttonDown = ( !isTouch? e.which>0 : e.touches.length>0 );

      //if( ! $(evt.target).closest('.canvas').size() ) return;

      if(!curContext) return;

      var x = evt.pageX-$(curContext).offset().left;
      var y = evt.pageY-$(curContext).offset().top;


      var canvas = $(evt.target).closest('.drawerLayer');
      var context = $(canvas).closest('.drawerLayer').get(0);

      var isShape = $(evt.target).hasClass('shape');
      var isText = $(evt.target).closest('.textWrap').size()>0;

      var targetEl = isText? $(evt.target).closest('.textWrap') : evt.target;


      if( 0&& isText && !dragging){
        var viewBW = getViewPortWH();
        var conPos = getOffsetXY(evt.pageX, evt.pageY, $('.textCon', canvas).get(0) , viewBW.bw, viewBW.bh );
        x=conPos.x;
        y=conPos.y;
      } else {
        x/=curScale;
        y/=curScale;        
      }


      function checkMoveOut(){
        if( !curContext || ( $(context).size() && context!=curContext )
            || ( !$(context).size() && (dragging||selecting) )
          ) {
          selecting = false;
          dragging = false;
          $('svg.canvas').removeClass('selectState');
          $('.selrect').hide();
          upFunc(e);
          return true;
        }
        return false;
      }

      if( checkMoveOut() ) return;



      var dx = x-downX;
      var dy = y-downY;

      //FIX for iPad which cannot select TextElement
      var el =getElementsFromPoint( [[x,y],[x,y]] );
      if(el.length){
        //debug( x+" "+y+" "+ el[0].tagName + " "+ el.length  )
        targetEl = el.pop();
        isText = $(targetEl).closest('.textWrap').size()>0;
      }

      if(!isText) e.preventDefault();

      var dist = downX&&downY && calcDist([downX, downY], [x,y]) || 0;

      var isHandler = $(evt.target).hasClass('handler');


      if( $('.dragHandler').size() && dist && buttonDown) {
        $('.handler').addClass('dragHandler');

        var rotXY = getRotateTranslate(null,dx,dy);
        dx = rotXY[0];
        dy = rotXY[1];

        var w = $('.textarea').width();
        var h = $('.textarea').height();

        if( w>10 && h>10) {
          var oldsize = $('.textarea').data('oldsize');
          $('.textarea').css({ width:oldsize.width+dx, height:oldsize.height+dy });
          var oldpos = $('.handler').data('oldpos');
          $('.handler').css({left: oldpos.left+dx , top:  oldpos.top+dy });
          dragging = true;
        }else{
          if(w<10) w=11;
          if(h<10) h=11;
          $('.textarea').css({ width:w, height:h });
          dragging = false;
          upFunc(e);
        }
      }

      if( $('.editing').size() ){

        return;
      }

      if( dist>10 ){
        prevTime = 0;
        clearTimeout(downTimer);
      }


      if( !isText && dist>10  )  disableSelection($('.textarea'));

      if(!dragging){

          if(!drawing && $('[data-hl]').size() && e.shiftKey && buttonDown ){
            selecting = true;
          }

          if( selecting && dist>10){

            var r = {};
            r.width = Math.abs(dx);
            r.height = Math.abs(dy);
            r.x = dx>0? downX : downX+dx;
            r.y = dy>0? downY : downY+dy;

            $('svg.canvas',context).addClass('selectState');
            $('.selrect',context).show().attr({x:r.x, y:r.y, width:r.width, height:r.height});

            $('.shape, .textWrap',context).filter(function(i,v){ return $(this).attr('newHL') }).data('hl', null);

            var els = getElementsFromPoint([[downX,downY],[x,y]]);

            els.forEach(function  (v) {

                if(! $(this).data('hl') ) addSelectionList(v, true);

            })


            return;

          }

      }


      //if(!e.shiftKey)
      if( dragging ){

          if( isHandler ){


          } else {
            $('[data-hl]').each(function  (i,v) {
              var oldTrans = $(v).attr('data-oldTrans');
              oldTrans= !oldTrans?[0,0]:oldTrans.split(',');

              if( $(v).hasClass('textWrap') ) {
                  var rotXY = getRotateTranslate(null,dx,dy);
                  dx = rotXY[0];
                  dy = rotXY[1];
              }

              var tx = dx+ ~~oldTrans[0];
              var ty = dy+ ~~oldTrans[1];


              setTranslateXY(v, tx, ty);

            });

          }

      }else{

        if(curTool=='curve'){

          if( !drawing && dist >DRAW_TOLERANCE ){
            drawing = true;
            rPath=[];
          }

          if(!drawing)return;

          var L = rPath.length;

          if(L && calcDist(rPath[L-1], [x, y])<DOT_DISTANCE )return;
          var el = makeShape("circle", { class:"hint", cx:x, cy:y, r:3, fill:"red" });
          curContext.querySelector('svg.canvas').appendChild( el );

          rPath.push( [x, y] );

        }

        if(curTool=='line'){

          if( !drawing && dist >DRAW_TOLERANCE ){
            drawing = true;
            createLine([downX, downY], [x,y]);
          }
          if(!drawing)return;

          var line = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createLine([downX, downY], [x,y], line);


        }

        if(curTool=='rect'){

          if( !drawing && dist >DRAW_TOLERANCE ){
            drawing = true;
            createRect([downX, downY], [x,y]);
          }
          if(!drawing)return;

          var rect = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createRect([downX, downY], [x,y], rect);


        }

        if(curTool=='circle'){

          if( !drawing && dist >DRAW_TOLERANCE ){
            drawing = true;
            createCircle([downX, downY], [x,y]);
          }
          if(!drawing)return;

          var circle = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createCircle([downX, downY], [x,y], circle);

        }

        if(curTool=='text'){
          if( !drawing && downX && downY && x && y && !dragging && !$('[data-hl]').size() && dist >DRAW_TOLERANCE ){
            drawing = true;
            createTextRect([downX, downY], [x,y]);
          }
          if(!drawing)return;

          var text = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createTextRect([downX, downY], [x,y], text);
        }


      }

    }

    function upFunc (e) {

      if(!curContext) return;

      //init
      var evt = /touch/.test(e.type) ? e.changedTouches[0] : e;

      var isShape = $(evt.target).hasClass('shape');
      var isText = $(evt.target).closest('.textWrap').size()>0;

      var targetEl = isText? $(evt.target).closest('.textWrap') : evt.target;

      var canvas = $(curContext).find('svg.canvas');

      var x = evt.pageX-$(curContext).offset().left;
      var y = evt.pageY-$(curContext).offset().top;

      if(0&&isText && !dragging){
        var viewBW = getViewPortWH();
        var conPos = getOffsetXY(evt.pageX, evt.pageY, $('.textCon', curContext).get(0) , viewBW.bw, viewBW.bh );
        x=conPos.x;
        y=conPos.y;
      } else {
        x/=curScale;
        y/=curScale;        
      }
      

      var dx = x-downX;
      var dy = y-downY;

      var dist = downX&&downY && calcDist([downX, downY], [x,y]) || 0;
      downX=downY=null;

      clearTimeout(downTimer);

      var context = curContext;

      //FIX for iPad which cannot select TextElement
      var el =getElementsFromPoint( [[x,y],[x,y]] );
      if(el.length){
        //debug( x+" "+y+" "+ el[0].tagName + " "+ el.length  )
        targetEl = el.pop();
        isText = $(targetEl).closest('.textWrap').size()>0;
      }
      var isHandler = $(evt.target).hasClass('handler');

      if(isHandler){

        var w = $('.textarea').width();
        var h = $('.textarea').height();

        var bbox = $('.editing').data('bbox') ;
        bbox[1][0] = bbox[0][0]+ w;
        bbox[1][1] = bbox[0][1]+ h;
        $('.editing').data('bbox', JSON.stringify(bbox) ) ;


        $(evt.target).removeClass('dragHandler');
        $('.textarea').focus();

        return;
      }

      if( $('.editing').size() ){
        return;
      }
      e.preventDefault();

      enableSelection($('.textarea'));

      if(isText && !e.shiftKey && dist<10 && !$(targetEl).data('hl') ){
         textEditMode(targetEl);
      }



      if(selecting){
        selecting = false;
        $('.selrect',context).hide();
        $('svg.canvas',context).removeClass('selectState');
        $('.shape, .textWrap',context).removeAttr('newHL');
        return;
      }

      // just click, no motion
      if( e.shiftKey && !dragging && !drawing && $('[data-hl]').length==0 ) {
        if( $(evt.target).hasClass('shape') ) addSelectionList(evt.target);
        return;
      }


      if(dragging){
        dragging=false;

        $(targetEl).attr('data-oldtrans', JSON.stringify( getTranslateXY(targetEl) ) );

        if(isHandler){

        }

        if(dist) svgHistory.update();
        return;
      }



      /**
      ******* Dot Text Creation, has many different way, so use dragged Text area instead.

      if(curTool=='text' && !drawing && !dragging &&
        !$(document.activeElement).is('.text') &&
        //( !prevFocus || !prevFocus.is('.text') ) &&
        !$('.editing').size()  ){

        var $curText = $( document.elementFromPoint(x,y) ).closest('.text');
        if( $curText.size() ){


        } else {

          createText([downX, downY], [x,y]);

        }

      }
      prevFocus = $(document.activeElement);
      ******* End Dot Text
      **/


      if(drawing){

        // yes motion, drawing path
        drawing = false;


        if(curTool=='curve'){


          createPath(rPath);

          document.querySelectorAll('circle.hint').forEach(function  (v) {
            v.parentNode.removeChild(v);
          });

         svgHistory.update();

        }

        if(curTool=='text'){

          if($('.textrect').size()==0  ) return;
          var startPoint = $('.textrect').data('startpoint') ;
          var endPoint = $('.textrect').data('endpoint') ;
          $('.textrect').remove();
          createText( startPoint, endPoint );

          $('.textarea').focus();
        }



      }

    }

    function pointsToRect (startPoint, endPoint, translate) {
      if(!translate) translate = [0,0];
      var x = Math.min(startPoint[0], endPoint[0]) + translate[0] ;
      var y = Math.min(startPoint[1], endPoint[1]) + translate[1];
      var w = Math.abs( startPoint[0] - endPoint[0] );
      var h = Math.abs( startPoint[1] - endPoint[1] );
      return {left:x, top:y, width:w, height:h};
    }



    window.addEventListener('keydown', handleShortKey);

    function handleShortKey (evt) {
      if( $('.editing').size() ) return;
      var handled = false;
      var cmd = (evt.ctrlKey ? 1 : 0) |
            (evt.altKey ? 2 : 0) |
            (evt.shiftKey ? 4 : 0) |
            (evt.metaKey ? 8 : 0);

      if (cmd === 0) { // no control key pressed at all.
        //console.log(evt.keyCode);
        switch (evt.keyCode) {
          case 8:  //delete key : Delete the shape
            var el = $('[data-hl]');
            if( el.length ){
              el.remove();
              svgHistory.update();
            }
        }
      }

    if (cmd === 1 || cmd === 8) {
      switch (evt.keyCode) {
        case 90:  //Ctrl+Z
          OPHistory.undo();
          break;
      }
    }

    if (cmd === 5 || cmd === 12) {
      switch (evt.keyCode) {
        case 90:
          OPHistory.redo();
          break;
      }
    }

    }


  var svgHistory = new function(html) {
    var self = this;
    $('.selrect').hide();

    this.step=0;
    this.html={};
    this.texthtml={};

    $('.drawerLayer').each(function  (i,v) {
      var i = $(v).data('page-number');
      this.html[i] = $('.svgCon', v).html();
      this.texthtml[i] = $('.textCon', v).html();
    });


    //here is an action we cant to be able to undo/redo
    this.update = function( _status ) {

        $('.selrect').hide();

        var status = _status;

        //this variable will be saved in the undo function's closure
        var oldHtml = self.html;
        var oldTextHtml = self.texthtml;

        var newHtml = {};
        var newTextHtml = {};

        $('.drawerLayer').each(function  (i,v) {
          var i = $(v).data('page-number');
          newHtml[i] = $('.svgCon', v).html();
          newTextHtml[i] = $('.textCon', v).html();
        });

        if( JSON.stringify(oldHtml)==JSON.stringify(newHtml) &&
         JSON.stringify(oldTextHtml)==JSON.stringify(newTextHtml) ) return;

        //self function sets up the action and performs it
        OPHistory.do(
            //the 'do' or 'redo' function
            function() {

              self.step++;

              self.html = newHtml;
              self.texthtml = newTextHtml;

              $('.drawerLayer').each(function  (i,v) {
                var i = $(v).data('page-number');
                if(newHtml[i]) $('.svgCon',v).html(newHtml[i]  );
                if(newTextHtml[i]) $('.textCon',v).html(newTextHtml[i] );
              });

            },

            //the 'undo' function
            function() {

              if(status=='init') return;

              self.step--;

              self.html = oldHtml;
              self.texthtml = oldTextHtml;

              $('.drawerLayer').each(function  (i,v) {
                var i = $(v).data('page-number');
                if(oldHtml[i]) $('.svgCon',v).html(oldHtml[i]);
                if(oldTextHtml[i]) $('.textCon',v).html(oldTextHtml[i]);
              });

              $('[data-hl]').attr('data-hl',null);
            }

        );
      }
  }

    function createLine (startPoint, endPoint, path, options) {

      if(!options) options = ToolSet['line'];

      if(!path){
        path = makeShape("path", { "class":'shape line', fill:"rgba(255,255,255,0.001)" });
        curShapeID = +new Date+Math.random();
        curContext.querySelector('svg.canvas').appendChild( path );
        path.setAttribute("data-id", curShapeID );
      }
      var d = 'M'+startPoint.join(',')+' '+endPoint.join(',');

      var swidth = options['stroke-width']||2;
      var highlight = options.highLight;

      var attr = {"d":d, "stroke-linecap":"round", "stroke-linejoin":"miter", "stroke-miterlimit":"4", stroke:options['stroke']||'#f00', "stroke-width": highlight ? swidth*4 : swidth , "opacity": highlight?0.5:1 }

      for(var i in attr){
        path.setAttribute(i, attr[i]);
      }

      path.setAttribute("marker-start", bit_check(options.arrow, 0x1) ? "url(#triangle)" : "none" );
      path.setAttribute("marker-end", bit_check(options.arrow, 0x2) ? "url(#triangle)" : "none" );

      path.setAttribute("data-bbox", JSON.stringify( [startPoint,endPoint] ) );
      path.setAttribute("data-tool", 'line' );
      path.setAttribute("data-startpoint", JSON.stringify( startPoint ) );
      path.setAttribute("data-endpoint", JSON.stringify( endPoint ) );
      path.setAttribute("data-options", JSON.stringify( options ) );

      addSelectionList(path);

    }


    function createRect (startPoint, endPoint, path, options) {

      if(!options) options = ToolSet['rect'];
      if(!path){
        path = makeShape("rect", { "class":'shape rect', fill:"rgba(255,255,255,0.001)" });
        curShapeID = +new Date+Math.random();
        curContext.querySelector('svg.canvas').appendChild( path );
        path.setAttribute("data-id", curShapeID );
      }

      var swidth = options['stroke-width']||2;

      var x = Math.min(startPoint[0], endPoint[0]);
      var y = Math.min(startPoint[1], endPoint[1]);
      var w = Math.abs( startPoint[0] - endPoint[0] );
      var h = Math.abs( startPoint[1] - endPoint[1] );

      if(w<20 || h<20) return;

      var attr = {"x":x, "y":y, "width":w, "height":h, "stroke-linecap":"round", "stroke-linejoin":"miter", "stroke-miterlimit":"4", stroke:options['stroke']||'#f00', "stroke-width": swidth }

      for(var i in attr){
        path.setAttribute(i, attr[i]);
      }

      path.setAttribute("data-bbox", JSON.stringify( [startPoint,endPoint] ) );
      path.setAttribute("data-tool", 'rect' );
      path.setAttribute("data-startpoint", JSON.stringify( startPoint ) );
      path.setAttribute("data-endpoint", JSON.stringify( endPoint ) );
      path.setAttribute("data-options", JSON.stringify( options ) );


      addSelectionList(path);

    }


    function createTextRect (startPoint, endPoint, path, options) {

      if(!options) options = ToolSet['rect'];

      if(!path){
        path = makeShape("rect", { "class":'shape textrect', fill:"rgba(255,255,255,0.001)" });
        curShapeID = +new Date+Math.random();
        curContext.querySelector('svg.canvas').appendChild( path );
        path.setAttribute("data-id", curShapeID );
      }

      var swidth = options['stroke-width']||2;

      var x = Math.min(startPoint[0], endPoint[0]);
      var y = Math.min(startPoint[1], endPoint[1]);
      var w = Math.abs( startPoint[0] - endPoint[0] );
      var h = Math.abs( startPoint[1] - endPoint[1] );

      var attr = {"x":x, "y":y, "width":w, "height":h, "stroke-linecap":"round", "stroke-linejoin":"miter", "stroke-dasharray":"20,10", "stroke-miterlimit":"4", stroke:options['stroke']||'#f00', "stroke-width": swidth }

      for(var i in attr){
        path.setAttribute(i, attr[i]);
      }

      path.setAttribute("data-bbox", JSON.stringify( [startPoint,endPoint] ) );
      path.setAttribute("data-tool", 'rect' );
      path.setAttribute("data-startpoint", JSON.stringify( startPoint ) );
      path.setAttribute("data-endpoint", JSON.stringify( endPoint ) );
      path.setAttribute("data-options", JSON.stringify( options ) );


    }



    function createSVGText (startPoint, endPoint, path, options) {

      if(!options) options = ToolSet['text'];
      console.log(options);
      if(!path){
        path = makeShape("text", { "class":'shape text' });
        curShapeID = +new Date+Math.random();
        curContext.querySelector('svg.canvas').appendChild( path );
        path.setAttribute("data-id", curShapeID );
      }

      var attr = {"x":endPoint[0], "y":endPoint[1], "fill":options.fill, "font-family": options['font-family'], "font-size": options['font-size'] }

      for(var i in attr){
        path.setAttribute(i, attr[i]);
      }

      path.innerHTML = "TEOWTIJIO";

      path.setAttribute("data-tool", 'text' );
      path.setAttribute("data-startpoint", JSON.stringify( startPoint ) );
      path.setAttribute("data-endpoint", JSON.stringify( endPoint ) );
      path.setAttribute("data-options", JSON.stringify( options ) );


    }


    function setupTextEvent(){
      var textCon = $(curContext);
      textCon.on("focus", ".textarea", function  (e) {
        if( $('.editing').size() )return;
      }).on("blur", ".textarea", function  (e) {
        if( $('.dragHandler').size() ) {
          return;
        }
        //onTextBlur();

      });

    }

    function onTextBlur(){

      ApplyLineBreaks( '.textarea' );

      var $text = $('.editing').find('.text');
      var val = $('.textarea').val();
      var prevVal = $text.html();

      if(val==""){
          try{
            $('.editing').remove();
           $('.textarea').remove();
           $('.handler').remove();
         }catch(e){}
         return;
      }

      $text.html( val );
      $($text).get(0).style.removeProperty('width');
      $($text).get(0).style.removeProperty('height');

      $('.editing').show();

      var offset = $('.textarea').offset();
      $('.editing').css( {width:offset.width, height:offset.height} );

      var th = $text.prop('scrollHeight'),  tw = $text.prop('scrollWidth');
      offset.width = tw;
      offset.height = th;

      var trans = ( $('.editing').data('oldTrans') );
      if(!trans) trans = [0,0];
      // offset.left += trans[0];
      // offset.top += trans[1];


      $('.editing').css( {width:offset.width, height:offset.height} );
      $('.editing').find('.bbox').css( {width:offset.width, height:offset.height} );


      var bbox = $('.editing').data('bbox') ;
      bbox[1][0] = bbox[0][0]+ offset.width;
      bbox[1][1] = bbox[0][1]+ offset.height;
      $('.editing').data('bbox', JSON.stringify(bbox) ) ;


      try{
         $('.textarea').remove();
         $('.handler').remove();
       }catch(e){}


      $('.editing').removeClass('editing');

      if(val==''){
        $('.editing').remove();
        if(prevVal!=''){
          setTimeout(function(){ svgHistory.update(); }, 100);
        }
      } else {
        setTimeout(function(){ svgHistory.update(); }, 100);
      }
    }

    setupTextEvent();


  function textEditMode (targetEl) {
      $('[data-hl]').data('hl',null);
      $(targetEl).addClass('editing').hide();
      var box = $(targetEl).data('bbox');
      var offset = pointsToRect(box[0], box[1], getTranslateXY(targetEl) );
     $(curContext).find('.textCon').append('<textarea class="text textarea" wrap="hard"></textarea>');
     $(curContext).find('.textCon').append('<div class="handler"></div>');

     var offset2 = { left:offset.left+offset.width, top:offset.top+offset.height } ;

     $('.handler')
      .data('targetId', $(targetEl).data('id') )
      .css(offset2);

     var style =  $(targetEl).find('.text').get(0).style;

     $('.textarea')
       .data('targetId', $(targetEl).data('id') )
       .css(offset).css({ 'font-family': style['font-family'], 'font-size':style['font-size'] })
       .html( $(targetEl)
        .find('.text').html() )
       .focus();
    }


    function createText (startPoint, endPoint, path, options, initText) {

      if(!options) options = ToolSet['text'];
      var isCeate = !path;

      if(isCeate){
        startPoint = rotateTextPoint( startPoint, curRotation );
        endPoint = rotateTextPoint( endPoint, curRotation );
      }

      if(!path){
        path = $('<div class="textWrap"><pre class="text textholder"></pre></div>');
        curShapeID = +new Date+Math.random();
        $('.textCon', curContext).append( path );
        path.attr("data-id", curShapeID );
      }

      path = $(path);
      var x = Math.min(startPoint[0], endPoint[0]);
      var y = Math.min(startPoint[1], endPoint[1]);
      var w = Math.abs( startPoint[0] - endPoint[0] );
      var h = Math.abs( startPoint[1] - endPoint[1] );


      var text = $(path).find('.text');

      text.css({  "color":options.stroke, "font-family": options['font-family'], "font-size": options['stroke-width'] });

      if( initText ){
          text.html( initText ).css({"width":w, "height":h});
      }

      if(!isCeate){
        h = text.prop('scrollHeight');
        w = text.prop('scrollWidth');

      }

      path.css({"left":x, "top":y, "width":w, "height":h});

      if(isCeate){
        var $bbox = $('<div class="bbox"></div>');
        path.append( $bbox );
      }
      $bbox = $(path).find('.bbox');

      $bbox.css({"left":0, "top":0, "width":w, "height":h});


        path.attr("data-bbox", JSON.stringify( [ [x,y], [x+w, y+h] ] ) );
        path.attr("data-tool", 'text' );
        path.attr("data-startpoint", JSON.stringify( startPoint ) );
        path.attr("data-endpoint", JSON.stringify( endPoint ) );
        path.attr("data-options", JSON.stringify( options ) );

      if(isCeate){
        if(!initText) textEditMode(path);
      } else {

      }

      if(isCeate){
        //rotateTextELement(text, w, h);
  }


      /*  // dblclick to trigger
      path.on('dblclick', function () {
          path.attr('contentEditable', 'true');
          path.blur();
          path.focus();
      });
      */

      if(!initText) addSelectionList(path);

    }

    function rotateTextELement(text, w, h){
      text.css({'transform-origin': '0% 0%'});
      if(curRotation==0){
        text.css({"width":w, "height":h, 'transform':'rotate(0deg) translate(0px,0px)'});
      }
      if(curRotation==90){
        text.css({"width":h, "height":w, 'transform':'rotate(90deg) translate(0px,-'+ w +'px)'});
      }
      if(curRotation==180){
        text.css({"width":w, "height":h, 'transform':'rotate(180deg) translate(-'+w+'px,-'+ h +'px)'});
      }
      if(curRotation==270){
        text.css({"width":h, "height":w, 'transform':'rotate(270deg) translate(-'+h+'px,0px)'});
      }
    }

    function createCircle (startPoint, endPoint, path, options) {

      if(!options) options = ToolSet['circle'];

      if(!path){
        path = makeShape("ellipse", { "class":'shape circle', fill:"rgba(255,255,255,0.001)" });
        curShapeID = +new Date+Math.random();
        curContext.querySelector('svg.canvas').appendChild( path );
        path.setAttribute("data-id", curShapeID );
      }

      var swidth = options['stroke-width']||2;

      var x = Math.min(startPoint[0], endPoint[0]);
      var y = Math.min(startPoint[1], endPoint[1]);
      var w = Math.abs( startPoint[0] - endPoint[0] );
      var h = Math.abs( startPoint[1] - endPoint[1] );
      var rx = w/2;
      var ry = h/2;
      var cx = x+rx;
      var cy = y+ry;


      var attr = {"cx":cx, "cy":cy, "rx":rx, "ry":ry, "stroke-linecap":"round", "stroke-linejoin":"miter", "stroke-miterlimit":"4", stroke:options['stroke']||'#f00', "stroke-width": swidth }

      for(var i in attr){
        path.setAttribute(i, attr[i]);
      }

      path.setAttribute("data-bbox", JSON.stringify( [startPoint,endPoint] ) );
      path.setAttribute("data-tool", 'circle' );
      path.setAttribute("data-startpoint", JSON.stringify( startPoint ) );
      path.setAttribute("data-endpoint", JSON.stringify( endPoint ) );
      path.setAttribute("data-options", JSON.stringify( options ) );

      addSelectionList(path);


    }





    function createPath (rPath, path, options) {

        if(!options) options = ToolSet['curve'];

        var L = rPath.length;

        var t, d='';
        var startP = rPath[0];
        var endP = startP;
        var newPath = rPath;

        if(!rPath || !L) return;


        for(var i=0; i<rPath.length; i++){
          var p=rPath[i];

          if ( 0 == i ) {
            d = "M" + p[0] + "," + p[1];
          } else if ( 1 == i ) {
            d += " R" + p[0] + "," + p[1];
          } else {
            d += " " + p[0] + "," + p[1];
          }
        }


        //Auto Close:
        if( L>5 )

        if( (options.autoClose&0x1)!=0 ){ // && calcDist(startP, p)<50
          //drawing rect LineTo way.
          d+=" M" + p[0] + "," + p[1];
          d+=" L" + startP[0] + "," + startP[1];
        } else if( (options.autoClose&0x2)!=0) {

          //drawing circle Curve way.

          var _interpo = calcInterpo(rPath, 10);
          d+=" C"+_interpo[1][0]+","+_interpo[1][1];
          d+=" "+_interpo[1][0]+","+_interpo[1][1];
          d+=" "+_interpo[2][0]+","+_interpo[2][1];

          newPath = rPath.concat( _interpo.slice(1) );
            //d += calcInterpo(rPath, 10);
            //newPath = rPath.concat( _interpo.slice(1) );
        }

        d = parsePath( d,true, 10 );
        if( !/undefined|NaN/.test(d) ){

            if(!path){
              path = makeShape("path", { "class":'shape curve', fill:"rgba(255,255,255,0.001)" });
              curShapeID = +new Date+Math.random();
              curContext.querySelector('svg.canvas').appendChild( path );
              path.setAttribute("data-id", curShapeID );
              path.setAttribute("data-path", JSON.stringify( rPath ) );
            }

            var attr = {"d":d, "stroke-linecap":"round", "stroke-linejoin":"miter", "stroke-miterlimit":"4", stroke:options['stroke']||'#f00', "stroke-width":options['stroke-width']||2, }

            for(var i in attr){
              path.setAttribute(i, attr[i]);
            }

            path.setAttribute("data-bbox", JSON.stringify( getPathBBox(newPath) ) );
            path.setAttribute("data-tool", 'curve' );
            path.setAttribute("data-options", JSON.stringify( options ) );

            //arrow: 0x0 no arrow, 0x1: start arrow, 0x2: end arrow
            path.setAttribute("marker-start", bit_check(options.arrow, 0x1) ? "url(#triangle)" : "none" );
            path.setAttribute("marker-end", bit_check(options.arrow, 0x2) ? "url(#triangle)" : "none" );


        } else {

        }

        addSelectionList(path);

        return path;
    }

    function addSelectionList (el, isNew) {
      if( $(el).data('hl') )return;
      $(el).data('hl', 1);
      $(el).attr('data-oldTrans', getTranslateXY(el).join(',') );
      if(isNew) $(el).get(0).setAttribute('newHL', 1);
      //$(el).appendTo( $(el).parent() );
      updateToolBox();
      //svgHistory.update();
    }

    function removeSelectionList (el, onlyNew) {
      if(onlyNew){
        if( $(el).get(0).getAttribute('newHL') ) $(el).data('hl', null);
      }else{
        $(el).data('hl', null);
      }
      updateToolBox();
    }



    function updateToolBox () {
      var theTool, maxt=0, tool={};
      $('[data-hl]').each( function(){ var t= $(this).data('tool'); tool[t] = tool[t]?tool[t]+1:1; } );
      for(var i in tool){
        if(tool[i]>maxt){
          maxt = tool[i];
          theTool = i;
        }
      }
      setTool(theTool);
    }

    function getTranslateXY(obj)
    {
        if(!obj) return [0,0];
       if(obj.size) obj=obj.get(0);
        var style = obj.style;
        var transform = style.transform || style.webkitTransform || style.mozTransform;
        var transformAttr =obj.getAttribute('transform');
        transform = (!transformAttr) ? transform :  transformAttr;
        if(!transform ) return [0,0];
    var zT = transform.match(/translate\(\s*([0-9.-]+[\w%]*)\s*,\s*([0-9.-]+[\w%]*)\s*\)/);
        return zT ? [ parseInt(zT[1]), parseInt(zT[2]) ] : [0,0];
    }
    function setTranslateXY(obj, x, y){
       if(!obj) return [0,0];
       if(obj.size) obj=obj.get(0);
        var style = obj.style;
        var transform = style.transform || style.webkitTransform || style.mozTransform;
        var transformAttr =obj.getAttribute('transform');
        transform = (!transformAttr) ? transform :  transformAttr;
        if(!transform ) transform="translate(0,0)";
        var re = /translate\(\s*([0-9.-]+[\w%]*)\s*,\s*([0-9.-]+[\w%]*)\s*\)/ig;
       if($(obj).closest('svg').size() ) {
          var newTransform = transform.replace(re, 'translate('+x + ','+ y + ')'  );
          $(obj).attr('transform', newTransform  );
       }else{
          var newTransform = transform.replace(re, 'translate('+x+'px,'+y +'px)');
          $(obj).css('transform', newTransform  );
       }
    }
    function calcInterpo (rPath, tension) {
      //interpolation using Curve to close the path.
      //https://github.com/epistemex/cardinal-spline-js
      var d="";
      var L=rPath.length;
      var _seg=2;
      var _tension= tension||0;
      var _ps = Math.floor(L/2);
      var points=[];

      for(var c=0, i=_ps; !(c>0 && i>_ps) ; i++) {
        if(i==L){
          c++;
          i=0;
        }
        points.push( rPath[i][0], rPath[i][1] );
      }
      var res = getCurvePoints( points, _tension, _seg );

      var _resStart = (_ps-1+L%2)*_seg*2 ;
      var _resLen = _seg*2;

      var _interpo=[]
      for(var i = _resStart; i <= _resStart+_resLen; i += 2){
        _interpo.push([ res[i], res[i+1] ]);
      }

      return _interpo;

      d+=" C"+_interpo[1][0]+","+_interpo[1][1];
      d+=" "+_interpo[1][0]+","+_interpo[1][1];
      d+=" "+_interpo[2][0]+","+_interpo[2][1];
      return d;
      //end of interpo
    }

    function bit_set(a,b) { return a |= (b)}
    function bit_clear(a,b) { return a &= ~(b)}
    function bit_flip(a,b) { return a ^= (b)}
    function bit_check(a,b) { return (a & (b)) !=0 }




function getPathBBox (rPath) {
  var x, y, minx, miny, maxx, maxy;

  minx = miny = Number.POSITIVE_INFINITY;
  maxx = maxy = Number.NEGATIVE_INFINITY;
  for(var i=0; i<rPath.length; i++){
    x = rPath[i][0];
    y = rPath[i][1];
    minx = Math.min(minx, x); miny = Math.min(miny, y);
    maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
  }
  return [ [minx, miny], [maxx, maxy] ];
}



// Function: getPathBBox
// Get correct BBox for a path in Webkit
// Converted from code found here:
// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
//
// Parameters:
// path - The path DOM element to get the BBox for
//
// Returns:
// A BBox-like object
var getPathBBox2 = function(path) {
  var seglist = path.pathSegList;
  var tot = seglist.numberOfItems;

  var bounds = [[], []];
  var start = seglist.getItem(0);
  var P0 = [start.x, start.y];

  var i;
  for (i = 0; i < tot; i++) {
    var seg = seglist.getItem(i);

    if(typeof seg.x === 'undefined') {continue;}

    // Add actual points to limits
    bounds[0].push(P0[0]);
    bounds[1].push(P0[1]);

    if(seg.x1) {
      var P1 = [seg.x1, seg.y1],
        P2 = [seg.x2, seg.y2],
        P3 = [seg.x, seg.y];

      var j;
      for (j = 0; j < 2; j++) {

        var calc = function(t) {
          return Math.pow(1-t,3) * P0[j]
            + 3 * Math.pow(1-t,2) * t * P1[j]
            + 3 * (1-t) * Math.pow(t, 2) * P2[j]
            + Math.pow(t,3) * P3[j];
        };

        var b = 6 * P0[j] - 12 * P1[j] + 6 * P2[j];
        var a = -3 * P0[j] + 9 * P1[j] - 9 * P2[j] + 3 * P3[j];
        var c = 3 * P1[j] - 3 * P0[j];

        if (a == 0) {
          if (b == 0) {
            continue;
          }
          var t = -c / b;
          if (0 < t && t < 1) {
            bounds[j].push(calc(t));
          }
          continue;
        }
        var b2ac = Math.pow(b,2) - 4 * c * a;
        if (b2ac < 0) {continue;}
        var t1 = (-b + Math.sqrt(b2ac))/(2 * a);
        if (0 < t1 && t1 < 1) {bounds[j].push(calc(t1));}
        var t2 = (-b - Math.sqrt(b2ac))/(2 * a);
        if (0 < t2 && t2 < 1) {bounds[j].push(calc(t2));}
      }
      P0 = P3;
    } else {
      bounds[0].push(seg.x);
      bounds[1].push(seg.y);
    }
  }

  var x = Math.min.apply(null, bounds[0]);
  var w = Math.max.apply(null, bounds[0]) - x;
  var y = Math.min.apply(null, bounds[1]);
  var h = Math.max.apply(null, bounds[1]) - y;
  return {
    'x': x,
    'y': y,
    'width': w,
    'height': h
  };
};


/**
 * Returns a 15 degree angle coordinate associated with the two given
 * coordinates
 * @param {number} x1 - First coordinate's x value
 * @param {number} x2 - Second coordinate's x value
 * @param {number} y1 - First coordinate's y value
 * @param {number} y2 - Second coordinate's y value
 * @returns {AngleCoord15}
*/
var snapToAngle = function (x1, y1, x2, y2) {
  var snap = Math.PI / 12; // 15 degrees
  var dx = x2 - x1;
  var dy = y2 - y1;
  var angle = Math.atan2(dy, dx);
  var dist = Math.sqrt(dx * dx + dy * dy);
  var snapangle = Math.round(angle / snap) * snap;

  return {
    x: x1 + dist * Math.cos(snapangle),
    y: y1 + dist * Math.sin(snapangle),
    a: snapangle
  };
};


/**
 * Check if two rectangles (BBoxes objects) intersect each other
 * @param {SVGRect} testPoints - The first BBox-like object, [[x1,y1], [x2,y2]]
 * @param {SVGRect} bbox - The second BBox-like object, [[x1,y1], [x2,y2]]
 * @param {SVGRect} trans - translate, [x,y]
 * @returns {boolean} True if rectangles intersect
 */
var rectsIntersect2 = function (testPoints, bbox, trans) {

  var r1={}, r2={};

  var startPoint = bbox[0];
  var endPoint = bbox[1];
  r2.x = Math.min(startPoint[0], endPoint[0]) + trans[0];
  r2.y = Math.min(startPoint[1], endPoint[1]) + trans[1];
  r2.width = Math.abs( startPoint[0] - endPoint[0] );
  r2.height = Math.abs( startPoint[1] - endPoint[1] );

  var startPoint = testPoints[0];
  var endPoint = testPoints[1];
  r1.x = Math.min(startPoint[0], endPoint[0]);
  r1.y = Math.min(startPoint[1], endPoint[1]);
  r1.width = Math.abs( startPoint[0] - endPoint[0] );
  r1.height = Math.abs( startPoint[1] - endPoint[1] );

  return r2.x < (r1.x + r1.width) &&
    (r2.x + r2.width) > r1.x &&
    r2.y < (r1.y + r1.height) &&
    (r2.y + r2.height) > r1.y;
};
var rectsIntersect = function (r1, r2) {
  return r2.x < (r1.x + r1.width) &&
    (r2.x + r2.width) > r1.x &&
    r2.y < (r1.y + r1.height) &&
    (r2.y + r2.height) > r1.y;
};



function disableSelection(node){
    $(node).addClass('unselectable');
    $(node).attr("unselectable","on");
    $(node).attr('disabled', 'disabled');
}

function enableSelection(node){
    $(node).removeClass('unselectable');
    $(node).attr("unselectable",null);
    $(node).attr('disabled', null);
}



(function ($) {
$.fn.disableSelection = function () {
    return this.each(function () {
        if (typeof this.onselectstart != 'undefined') {
            this.onselectstart = function() { return false; };
        } else if (typeof this.style.MozUserSelect != 'undefined') {
            this.style.MozUserSelect = 'none';
        } else {
            this.onmousedown = function() { return false; };
            this.onmousemove = function() { return false; };
        }
    });
};
})(Zepto);


function ApplyLineBreaks(strTextAreaId) {
    var oTextarea = $(strTextAreaId).get(0);
    if (oTextarea.wrap) {
        oTextarea.setAttribute("wrap", "off");
    }
    else {
        oTextarea.setAttribute("wrap", "off");
        var newArea = oTextarea.cloneNode(true);
        newArea.value = oTextarea.value;
        oTextarea.parentNode.replaceChild(newArea, oTextarea);
        oTextarea = newArea;
    }

    var strRawValue = oTextarea.value;
    oTextarea.value = "";
    var nEmptyWidth = oTextarea.scrollWidth;

    function testBreak(strTest) {
        oTextarea.value = strTest;
        return oTextarea.scrollWidth > nEmptyWidth;
    }
    function findNextBreakLength(strSource, nLeft, nRight) {
        var nCurrent;
        if(typeof(nLeft) == 'undefined') {
            nLeft = 0;
            nRight = -1;
            nCurrent = 64;
        }
        else {
            if (nRight == -1)
                nCurrent = nLeft * 2;
            else if (nRight - nLeft <= 1)
                return Math.max(2, nRight);
            else
                nCurrent = nLeft + (nRight - nLeft) / 2;
        }
        var strTest = strSource.substr(0, nCurrent);
        var bLonger = testBreak(strTest);
        if(bLonger)
            nRight = nCurrent;
        else
        {
            if(nCurrent >= strSource.length)
                return null;
            nLeft = nCurrent;
        }
        return findNextBreakLength(strSource, nLeft, nRight);
    }

    var i = 0, j;
    var strNewValue = "";
    while (i < strRawValue.length) {
        var breakOffset = findNextBreakLength(strRawValue.substr(i));
        if (breakOffset === null) {
            strNewValue += strRawValue.substr(i);
            break;
        }
        var nLineLength = breakOffset - 1;
        for (j = nLineLength - 1; j >= 0; j--) {
            var curChar = strRawValue.charAt(i + j);
            if (curChar == ' ' || curChar == '-' || curChar == '+') {
                nLineLength = j + 1;
                break;
            }
        }
        strNewValue += strRawValue.substr(i, nLineLength) + "\n";
        i += nLineLength;
    }
    oTextarea.value = strNewValue;
    oTextarea.setAttribute("wrap", "");
}



function getOffsetXY(pageX, pageY, element,width, height) {
  if(!element) return;
  var oldWidth = $(element).width();
  var oldHeight = $(element).height();
  $(element).width(width);
  $(element).height(height);
  function coords(element) {
    var div = document.createElement('div'),
        e = [], i;
    div.style.display = 'none';
    element.appendChild(div);
    for (i = 0; i < 4; i++) {
      div.style.cssText = 'display:block;width:0;height:0;position:absolute;left:' + (i % 3 ? 100 : 0) + '%;top:' + (i < 2 ? 0 : 100) + '%;';
      e[i] = div.getBoundingClientRect();
    }
    element.removeChild(div);
    return e;
  }
  var e = coords(element), a, d, c;
  a = [
    [e[3].top - e[0].top, e[0].top - e[1].top],
    [e[0].left - e[3].left, e[1].left - e[0].left]
  ];
  d = (a[0][0] * a[1][1] - a[0][1] * a[1][0]);
  c = [pageX - window.pageXOffset - e[0].left, 
       pageY - window.pageYOffset - e[0].top];
  //c = [pageX, pageY];

  $(element).width(oldWidth);
  $(element).height(oldHeight);

  return {
    x: (c[0] * a[0][0] + c[1] * a[1][0])/d*width,
    y: (c[0] * a[0][1] + c[1] * a[1][1])/d*height
  };
}

function GetZoomFactor () {
    var factor = 1;
    if (document.body.getBoundingClientRect) {
            // rect is only in physical pixel size in IE before version 8 
        var rect = document.body.getBoundingClientRect ();
        var physicalW = rect.right - rect.left;
        var logicalW = document.body.offsetWidth;

            // the zoom level is always an integer percent value
        factor = Math.round ((physicalW / logicalW) * 100) / 100;
    }
    return factor;
}

function GetScrollPositions () {
    if ('pageXOffset' in window) {  // all browsers, except IE before version 9
        var scrollLeft =  window.pageXOffset;
        var scrollTop = window.pageYOffset;
    }
    else {      // Internet Explorer before version 9
        var zoomFactor = GetZoomFactor ();
        var scrollLeft = Math.round (document.documentElement.scrollLeft / zoomFactor);
        var scrollTop = Math.round (document.documentElement.scrollTop / zoomFactor);
    }
    return [scrollLeft, scrollTop];
}



