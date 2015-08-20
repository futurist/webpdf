
/****
* in viewer.js File, line 3555, add This line to join:
* function PDFPageView(options) {
*   LINE 3555:   this.drawView = new DrawView(options, this);
*
* reset: function PDFPageView_reset(keepAnnotations) {
*   LINE 3588:  this.drawView.reset();
*
* change: all window.location.search to window.location.hash
*/

var host = "http://1111hui.com:88";
var wxOAuthUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx59d46493c123d365&redirect_uri=http%3A%2F%2F1111hui.com%2F/pdf/getUserID.php&response_type=code&scope=snsapi_base&state='+ encodeURIComponent( window.location.href.replace('#','{@@@}') ) +'#wechat_redirect';
var DEBUG= 1;
if(!DEBUG)
{

$(function(){
var wxUserInfo = Cookies.get( 'wxUserInfo' );
if( !wxUserInfo ){
  window.location = wxOAuthUrl;
} else {
   wxUserInfo = JSON.parse(wxUserInfo);
    $.post(host+'/getUserInfo', { userid: wxUserInfo.UserId }, function  (userinfo) {
        if(!userinfo){
          alert('非法用户');
          return;
        }

        rootPerson = userinfo;
    });
}
});

}else{
  var wxUserInfo={};
  wxUserInfo.UserId = 'yangjiming';
}



function initWX() {
	$.post(host+'/getJSConfig', { url:window.location.href.split('#')[0] }, function(data){
		if(!data || data[0]!='{') {
			alert('获取微信接口错误');
			wx.closeWindow();
			return;
		}
		data = JSON.parse(data);
		wx.config(data);
		wx.ready(function(){
			window.wxReady = true;
			return;
		});
		wx.error(function(res){
			alert('身份验证失败');
			wx.closeWindow();
		});

	});
}
if(isWeiXin) initWX();


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
    $drawCon.hide();


    // create input Viewer for user input in template area
    var div = document.createElement('div');
    div.id = 'inputLayer' + this.id;
    div.className = 'page inputLayer';
    div.style.width = Math.floor(this.viewport.width) + 'px';
    div.style.height = Math.floor(this.viewport.height) + 'px';
    div.setAttribute('data-page-number', this.id);
    this.inputDiv = div;

    var $inputCon = $drawCon.next().size()
              ? $drawCon.next()
              : $('<div id="inputViewer" class="inputViewer">').appendTo( $drawCon.parent() );

    $inputCon.append(div);
    $(div).append('<div class="inputCon"></div>');
    //$inputCon.hide();


    window.viewBox = pageView.viewport.viewBox;
    var R = pageView.viewport.rotation;
    var W = R%180? viewBox[3] : viewBox[2];
    var H = R%180? viewBox[2] : viewBox[3];

    var $drawerLayer = $(this.div);

    var str = '<div class="svgCon" style="padding-top:0px;"> <svg viewBox="0 0 {{width}} {{height}}" preserveAspectRatio="xMidYMid meet" class="canvas" xmlns="http://www.w3.org/2000/svg" version="1.1"> <defs> <marker id="triangle" preserveAspectRatio="xMinYMin meet" viewBox="0 0 100 100" refX="50" refY="50" markerUnits="userSpaceOnUse" stroke="#f00" fill="#f00" stroke-linecap="round" stroke-width="10" stroke-linejoin="bevel" markerWidth="40" markerHeight="30" orient="auto"> <path d="M 0 0 L 100 50 L 0 100 L 30 50 z" /> </marker> </defs> <rect class="selrect" style="display:none; stroke:#999; stroke-width:1; stroke-dasharray:10,5; fill:none;" /> </svg> </div> <div class="textCon" class="canvas"> </div>';
    str = str.replace('{{width}}', W).replace('{{height}}', H);

    $drawerLayer.empty().append(str).data('page-number', this.id);

    pageView.drawerLayer = $drawerLayer.get(0);
    window.pdfViewer = PDFViewerApplication.pdfViewer;
    window.curFile = PDFViewerApplication.url;

    init( $drawerLayer );

    restoreCanvas();

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


});

document.addEventListener('pagerendered', function (e) {
  var pageIndex = e.detail.pageNumber - 1;
  RERenderDrawerLayer(pageIndex);

});


function RERenderDrawerLayer(pageIndex){
  var page = pageIndex+1;
	var pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);
	var oldRotation = window.curRotation||0;
	window.curScale = pageView.viewport.scale;
	window.curRotation = pageView.viewport.rotation;
	window.viewBox = pageView.viewport.viewBox;
	var R = pageView.viewport.rotation;
	var W = R%180? viewBox[3] : viewBox[2];
	var H = R%180? viewBox[2] : viewBox[3];

  $('#drawerLayer'+ page).css({width: ~~pageView.width, height: ~~pageView.height  });
  $('#inputLayer'+ page).css({width: ~~pageView.width, height: ~~pageView.height  });

	copyDrawerLayerData(pageIndex);

  copyInputLayerData(pageIndex);

	restoreSignature(pageIndex);
  //setStage( curStage );

	//text tranlation with rotation

	var transformProp = '-webkit-transform';	// isAndroid ? '-webkit-transform' : 'transform';
	$('.textCon').show().css({'-webkit-transform': 'scale('+curScale+')' });
	window.curRotation = 0;

	// if(curRotation == 0){
	//   $('.textCon').show().css({'-webkit-transform': 'scale('+curScale+')' });
	// }
	// if(curRotation == 90){
	//   $('.textCon').show().css({'-webkit-transform': 'scale('+curScale+') rotate(90deg) translate(0,-'+ H +'px)' });
	// }
	// if(curRotation == 180){
	//   $('.textCon').show().css({'-webkit-transform': 'scale('+curScale+') rotate(180deg) translate(-'+ W +'px,-'+ H +'px)' });
	// }
	// if(curRotation == 270){
	//   $('.textCon').show().css({'-webkit-transform': 'scale('+curScale+') rotate(270deg) translate(-'+ W +'px,-'+ 0 +'px)' });
	// }



	var p = getRealOffset( $('.svgCon').parent() );
	$('.svgCon').width( p.width );
	$('.svgCon').height( p.height );


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

	  //svgHistory.update('init');

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

}


function getRealOffset(el){
	var offset = $(el).offset();
	var compStyle =window.getComputedStyle( $(el).get(0) );
	var borderL = parseInt(compStyle['border-left-width'], 10);
	var borderR = parseInt(compStyle['border-right-width'], 10);
	var borderT = parseInt(compStyle['border-top-width'], 10);
	var borderB = parseInt(compStyle['border-bottom-width'], 10);
	offset.left += borderL;
	offset.top += borderT;
	offset.width -= borderL+borderR;
	offset.height -= borderT+borderB;
	return offset;
}


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
  if(window.curStage == 'remark')  $('.textLayer').hide();
}, true);


window.curStage = 'remark';
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


$(document).add($(window)).on('touchmove', function(e) {
    if(window.curStage=='remark')e.preventDefault();
  }
);

var isAndroid = /(android)/i.test(navigator.userAgent);
var isWeiXin = navigator.userAgent.match(/MicroMessenger\/([\d.]+)/i);
var isiOS = /iPhone/i.test(navigator.userAgent) || /iPod/i.test(navigator.userAgent) || /iPad/i.test(navigator.userAgent);
var isMobile = isAndroid||isWeiXin||isiOS;

// init function
function init (context) {

  var pos = $('svg.canvas', context).offset();

  //$('.svgCon').css({ left:pos.left+'px', top:pos.top+'px' }).attr({width: pos.width+'px', height: pos.height+'px'});
  //$('.textCon').css({ left:pos.left+'px', top:pos.top+'px', width:0+'px', height:0+'px' });

  $('svg.canvas', context).data('id', NewID() );
  $('.svgCon', context).data('id', NewID() );
  $('.textCon', context).data('id', NewID() );
  $('.textLayer').hide();



}




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
    var DOT_DISTANCE=6;
    var DRAW_TOLERANCE=3;
    var drawing = false;
    var dragging = false;
    var selecting = false;

    // the current tool when user select
    var curTool = null;
    var prevEl = null;

    // whether it's touch screen
    var isTouch = ('ontouchstart' in window) || ('DocumentTouch' in window && document instanceof DocumentTouch);

    // touch event uniform to touchscreen & PC
    var downE = isMobile? 'touchstart' :'mousedown';
    var moveE = isMobile? 'touchmove' :'mousemove';
    var upE = isMobile? 'touchend' :'mouseup';
    var leaveE = isMobile? 'touchcancel' :'mouseleave';

    // the preset toolset
    var ToolSet = {
      curve:{
        "stroke-width": 2,
        "stroke":"#f00",
        "autoClose":2,
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



    function switchOption (con, tool, options) {
    	$(con+' .subtool').hide();
      $(con+' .subtool_'+tool).show().addClass('active');
      updateViewArea();
    }

    function rotatePDF(dir){


      $.post(host+'/rotateFile', {url: window.curFile, dir:dir}, function(data){
        data = JSON.parse(data);
        var oldUrl = window.location.href.split('/')
        oldUrl.pop();
        oldUrl.push(data.key);
        var newUrl = oldUrl.join('/');
        console.log(newUrl);
        window.location = newUrl;
        window.location.reload();
      } );

      return;

      $.ajax({
            type : "get",
            async: false,
            url : host+'/rotateFile?url='+ window.curFile + '&dir='+dir,
            dataType : "jsonp",
            jsonp: "callback",//传递给请求处理程序或页面的，用以获得jsonp回调函数名的参数名(默认为:callback)
            success : function(json){
                alert(json);
            },
            error:function(){
                alert('fail');
            }
        });


    }

    function setTool (tool, options, noUpdateHistory) {

    	if(!tool) return;
      if(!options && curTool!=tool){
        $('[data-hl]').attr('data-hl', null);
      }
      curTool = tool;

      if(!options) options={};

      $('#drawTool .subtool').hide();
      $('#drawTool .subtool_'+tool).show();

      updateViewArea();

      if(noUpdateHistory) return;

      var shapeA = [];
      if( $('[data-hl], .editing').size() ){
        shapeA = $('[data-hl], .editing').toArray();
        shapeA = shapeA.filter(function onlyUnique(value, index, self) {
		    return self.indexOf(value) === index;
		});
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

        	if( $('.textarea').size() ){
        		$('.textarea, .editing').css({  "font-family": newOptions['font-family'], "font-size": newOptions['stroke-width'] });
        		$('.editing').data('options', JSON.stringify( newOptions) );
        		return;
        	}

          var startPoint = (start);
          var endPoint = (end);
          createText(startPoint, endPoint, v, newOptions);

        }


        isDirty = true;
      });
      if(isDirty && !noUpdateHistory) svgHistory.update();
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
    function debug () {
      var str="";
      for(var i=0; i<arguments.length; i++){
        str+=arguments[i] + ' ';
      }
      $('#debug').show().html( ++debugID +" "+ str.replace(/</g, '&lt;').replace(/>/g, '&gt;') );
    }

    function getElementsFromPoint (rectPoint) {
      var els = [];
      $('.shape, .textWrap').each( function  (i,v) {
        var _bb = $(v).data('bbox');
        var _trans = getTranslateXY(v, 'getElementsFromPoint');
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
      	var oldTrans = getTranslateXY(v, 'beginDrag');
        $(v).attr('data-oldTrans', oldTrans.join(',') );
      });
    }


    function downFunc (e) {
      setTimeout(function(){ $('.colorCon').hide(); }, 200);
      var evt = /touch/.test(e.type) ? e.touches[0] : e;
      var canvas = $(evt.target).closest('.drawerLayer')
      if(!canvas.size()) {
        curContext = null;
        return;
      }

      //console.log(canvas, getOffsetXY(evt.pageX, evt.pageY, canvas.get(0)) );
      var isShape = $(evt.target).hasClass('shape');
      var isText = $(evt.target).closest('.textWrap').size()>0;

      var x = evt.pageX- getRealOffset($(canvas)).left;
      var y = evt.pageY-getRealOffset($(canvas)).top;

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
          //beginDrag();

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

      var buttonDown = ( !isMobile? e.which>0 : e.touches.length>0 );

      //if( ! $(evt.target).closest('.canvas').size() ) return;
      if(!curContext) {
      	return;
      }
      var x = evt.pageX-getRealOffset($(curContext)).left;
      var y = evt.pageY-getRealOffset($(curContext)).top;


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

      if( checkMoveOut() ){
      	return;
      }



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
            if(!isAndroid) createLine([downX, downY], [x,y]);
          }
          if(!drawing)return;

          if(!isAndroid){
	          var line = curContext.querySelector('[data-id="'+ curShapeID +'"]');
	          createLine([downX, downY], [x,y], line);
          }


        }

        if(curTool=='rect'){

          if( !drawing && dist >DRAW_TOLERANCE ){
            drawing = true;
            if(!isAndroid) createRect([downX, downY], [x,y]);
          }
          if(!drawing)return;

          if(!isAndroid){
	          var rect = curContext.querySelector('[data-id="'+ curShapeID +'"]');
	          createRect([downX, downY], [x,y], rect);
	      }


        }

        if(curTool=='circle'){

          if( !drawing && dist >DRAW_TOLERANCE ){
            drawing = true;
            if(!isAndroid) createCircle([downX, downY], [x,y]);
          }
          if(!drawing)return;

          if(!isAndroid){
	          var circle = curContext.querySelector('[data-id="'+ curShapeID +'"]');
	          createCircle([downX, downY], [x,y], circle);
	      }

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

      var x = evt.pageX-getRealOffset($(curContext)).left;
      var y = evt.pageY-getRealOffset($(curContext)).top;

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
      var prevX = downX;
      var prevY = downY;

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
        w/=curScale;
        h/=curScale;

        var bbox = $('.editing').data('bbox') ;
        var bboxLeft = Math.min( bbox[1][0], bbox[0][0] );
        var bboxTop = Math.min( bbox[1][1], bbox[0][1] );
        newBBox=[ [bboxLeft, bboxTop], [bboxLeft+w, bboxTop+h] ];
        $('.editing').data('bbox', JSON.stringify(newBBox) ) ;


        $(evt.target).removeClass('dragHandler');
        setTimeout(function(){
        	$('.textarea').focus();
        }, 10);
        return;
      }

      if( $('.editing').size() ){
        return;
      }
      e.preventDefault();

      enableSelection($('.textarea'));

      if(isText && !e.shiftKey && dist<DRAW_TOLERANCE && !$(targetEl).data('hl') ){
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

        $(targetEl).attr('data-oldtrans', JSON.stringify( getTranslateXY(targetEl,'dragging') ) );

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


        if(isAndroid && curTool=='line') {
          var line = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createLine([prevX, prevY], [x,y]);
        }

        if(isAndroid && curTool=='rect') {
          var rect = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createRect([prevX, prevY], [x,y]);
        }
        if(isAndroid && curTool=='circle') {
          var circle = curContext.querySelector('[data-id="'+ curShapeID +'"]');
          createCircle([prevX, prevY], [x,y]);
        }

        if(curTool=='text'){

          if($('.textrect').size()==0  ) return;
          var startPoint = $('.textrect').data('startpoint') ;
          var endPoint = $('.textrect').data('endpoint') ;
          $('.textrect').remove();
          createText( startPoint, endPoint );

          setTimeout(function(){
			$('.textarea').focus();
          },30);

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
        //console.log(evt, evt.keyCode);
        switch (evt.keyCode) {
          case 8:  //backspace key : Delete the shape
          case 46:  //delete key : Delete the shape
            var el = $('[data-hl]');
            if( el.length ){
              el.remove();
              svgHistory.update();
            }
            handled = true;
            break;
        }
      }

    if (cmd === 1 || cmd === 8) {
      switch (evt.keyCode) {
        case 90:  //Ctrl+Z
          OPHistory.undo();
            handled = true;
          break;
      }
    }

    if (cmd === 5 || cmd === 12) {
      switch (evt.keyCode) {
        case 90:
          OPHistory.redo();
            handled = true;
          break;
      }
    }



  // Some shortcuts should not get handled if a control/input element
  // is selected.
  var curElement = document.activeElement || document.querySelector(':focus');
  var curElementTagName = curElement && curElement.tagName.toUpperCase();
  if (curElementTagName === 'INPUT' ||
      curElementTagName === 'TEXTAREA' ||
      curElementTagName === 'SELECT') {
    // Make sure that the secondary toolbar is closed when Escape is pressed.
    if (evt.keyCode !== 27) { // 'Esc'
      return;
    }
    handled = false;
  }

    if(handled){
      evt.preventDefault();
      return;
    }

}


  var svgHistory = new function(html) {
    var self = this;
    $('.selrect').hide();

    this.step=-1;
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

        if( _status!='force' && JSON.stringify(oldHtml)==JSON.stringify(newHtml) &&
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

      var a= Victor.fromArray(startPoint);
      var b= Victor.fromArray(endPoint);
      var c = b.clone().subtract(a);
      var snapAngle = Math.round(c.angleDeg()/15)*15 /180 * Math.PI;
      //console.log( c.angleDeg(), c.length() *Math.cos( c.angle()-snapAngle ) );
      endPoint = [ startPoint[0]+ c.length() *Math.cos( snapAngle ), startPoint[1]+ c.length() *Math.sin( snapAngle ) ];

      if(!path){
        path = makeShape("path", { "class":'shape line', fill:"rgba(255,255,255,0.001)" });
        curShapeID = +new Date+Math.random();
        curContext.querySelector('svg.canvas').appendChild( path );
        path.setAttribute("data-id", curShapeID );
      }
      var d = 'M'+startPoint.join(',')+' '+endPoint.join(',');

      var swidth = options['stroke-width']||2;
      var light = options.highLight;

      //"stroke-linecap":"round", "stroke-linejoin":"miter", "stroke-miterlimit":"4",
      var attr = {"d":d,  stroke:options['stroke']||'#f00', "stroke-width": light ? swidth*4 : swidth , "opacity": light?0.5:1 }
      path.style['opacity'] = light?0.5:1;

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

    	function restoreViewerPosition(){
	      var viewer =$('#viewerContainer');
	      var oldTop = viewer.data('oldTop');
	      if(oldTop) viewer.scrollTop( ~~oldTop );
    	}

      var isTemplate = $('.editing').data('template');

      var offset = $('.textarea').offset();
      offset.width /= curScale;
      offset.height /= curScale;

      $('.editing').show();
      var $text = $('.editing').find('.text');
      var oldVal = $('.textarea').val();

      if(!isTemplate){

        ApplyLineBreaks( '.textarea' );
        var val = $('.textarea').val();
        var prevVal = $text.html();

        if(val==""){
            try{
              $('.editing').remove();
             $('.textarea').remove();
             $('.handler').remove();
           }catch(e){}
           restoreViewerPosition();
           return;
        }

        $text.html( val );
        $($text).get(0).style.removeProperty('width');
        $($text).get(0).style.removeProperty('height');

        $('.editing').css( {width:offset.width, height:offset.height} );

        var th = $text.prop('scrollHeight'),  tw = $text.prop('scrollWidth');
        offset.width = tw/curScale;
        offset.height = th/curScale;

        var trans = ( $('.editing').data('oldTrans') );
        if(!trans) trans = [0,0];
        // offset.left += trans[0];
        // offset.top += trans[1];
        $text.html( oldVal );

        $('.editing').css( {width:offset.width, height:offset.height} );
        $('.editing').find('.bbox').css( {width:offset.width, height:offset.height} );
        offset = $text.offset();
        offset.width/=curScale;
        offset.height/=curScale;
        $('.editing').css( {height:offset.height} );
        $('.editing').find('.bbox').css( {height:offset.height} );
      } else {
        $('.editing').css( {width:offset.width, height:offset.height} );
        $('.editing').find('.bbox').css( {width:offset.width, height:offset.height} );
        $text.html( oldVal );
      }



	var bbox = $('.editing').data('bbox') ;
	var bboxLeft = Math.min( bbox[1][0], bbox[0][0] );
	var bboxTop = Math.min( bbox[1][1], bbox[0][1] );
	newBBox=[ [bboxLeft, bboxTop], [bboxLeft+offset.width, bboxTop+offset.height] ];
	$('.editing').data('bbox', JSON.stringify(newBBox) ) ;

      var options = $('.editing').data('options');
      $('.editing pre').css({  "color":options.stroke, "font-family": options['font-family'], "font-size": options['stroke-width'] });

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

        //$text.html( val.replace(/\n/g, '') );
        setTimeout(function(){ svgHistory.update(); }, 100);
      }

      restoreViewerPosition();

    }

    setupTextEvent();


  function textEditMode (targetEl) {
      $('[data-hl]').data('hl',null);
      $(targetEl).addClass('editing').hide();
      var box = $(targetEl).data('bbox');
      var offset = pointsToRect(box[0], box[1], getTranslateXY(targetEl) );
      //offset.width += 30;

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

      //if in android, we move textarea to top to show keyboard correctly.
      if(isAndroid){
	      var viewer =$('#viewerContainer');
	      var oldTop = viewer.scrollTop();
	      viewer.data('oldTop', oldTop);
	      var offset = $('.textarea').offset();
	      viewer.scrollTop( oldTop+offset.top - 40 );
	  }

    }


    function createText (startPoint, endPoint, path, options, initText) {

      if(!options) options = ToolSet['text'];
      var isCeate = !path;

      var size = options['stroke-width'];
      options['stroke-width'] = Math.max(6, size);

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
      if(window.isTemplate) $(path).data('template', window.isTemplate);

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
      var oldTrans = getTranslateXY(el, 'selectionList');
      $(el).attr('data-oldTrans', oldTrans.join(',') );
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
      setTool(theTool, {}, true);
    }

    function getTranslateXY(obj, source)
    {
        if(!obj) return [0,0];
       if(obj.size) obj=obj.get(0);
        var style = obj.style;
        var transform = style.webkitTransform || style.transform || style.mozTransform;
        // var transform = style.cssText.match(/-webkit-transform:([^;]*);|transform:([^;]*);/i);
        // if(transform) transform=transform[0];
        // else transform = 'transform: translate(0px, 0px);';
        var transformAttr =obj.getAttribute('transform');
        transform = (!transformAttr) ? transform :  transformAttr;
        if(!transform ) return [0,0];
    var zT = transform.match(/translate\(\s*([0-9.-]+[\w%]*)\s*,\s*([0-9.-]+[\w%]*)\s*\)/);
        return zT ? [ parseInt(zT[1]), parseInt(zT[2]) ] : [0,0];
    }
    function setTranslateXY(obj, x, y){
    	if(!x||!y) return;
       if(!obj) return [0,0];
       if(obj.size) obj=obj.get(0);
        var style = obj.style;
        var transform = style.webkitTransform  || style.transform || style.mozTransform;
        // var transform = style.cssText.match(/-webkit-transform:([^;]*);|transform:([^;]*);/i);
        // if(transform) transform=transform[0];
        // else transform = 'transform: translate(0px, 0px);';

        var transformAttr =obj.getAttribute('transform');
        transform = (!transformAttr) ? transform :  transformAttr;
        if(!transform ) transform="translate(0,0)";
        var re = /translate\(\s*([0-9.-]+[\w%]*)\s*,\s*([0-9.-]+[\w%]*)\s*\)/ig;
       if($(obj).closest('svg').size() ) {
          var newTransform = transform.replace(re, 'translate('+x + ','+ y + ')'  );
          $(obj).attr('transform', newTransform  );
       }else{
          var newTransform = transform.replace(re, 'translate('+parseInt(x)+'px,'+ parseInt(y) +'px)');
          $(obj).css('-webkit-transform', newTransform  );
	          return;
          if(isAndroid){
	          var oldCSS = $(obj).get(0).style.cssText + '-webkit-transform:none;';
	          $(obj).get(0).style.cssText = oldCSS.replace( /-webkit-transform:[^;]*;|transform:[^;]*;/ig, '-webkit-transform:'+newTransform+';' );
	      } else {
	          $(obj).css('transform', newTransform  );
	      }
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
  return r2.left < (r1.left + r1.width) &&
    (r2.left + r2.width) > r1.left &&
    r2.top < (r1.top + r1.height) &&
    (r2.top + r2.height) > r1.top;
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
  var oldWidth = $(element).get(0).style.width;
  var oldHeight = $(element).get(0).style.height;
  if(width) $(element).width(width);
  if(height) $(element).height(height);
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

  $(element).get(0).style.width = oldWidth;
  $(element).get(0).style.height = oldHeight;

  return {
    x: (c[0] * a[0][0] + c[1] * a[1][0])/d,
    y: (c[0] * a[0][1] + c[1] * a[1][1])/d
  };
}


function getOffset(event,elt){
    var iterations=0;
    //if we have webkit, then use webkitConvertPointFromPageToNode instead
    if(window.webkitConvertPointFromPageToNode){
        var webkitPoint=webkitConvertPointFromPageToNode(elt,new WebKitPoint(event.clientX,event.clientY));
        //if it is off-element, return null
        if(webkitPoint.x<0||webkitPoint.y<0)
            return null;
        return {
            x: webkitPoint.x,
            y: webkitPoint.y,
            time: new Date().getTime()-st
        }
    }
    //make full-size element on top of specified element
    var cover=document.createElement('div');
    //add styling
    cover.style.cssText='height:100%;width:100%;opacity:0;position:absolute;z-index:5000;';
    //and add it to the document
    elt.appendChild(cover);
    //make sure the event is in the element given
    if(document.elementFromPoint(event.clientX,event.clientY)!==cover){
        //remove the cover
        cover.parentNode.removeChild(cover);
        //we've got nothing to show, so return null
        return null;
    }
    //array of all places for rects
    var rectPlaces=['topleft','topcenter','topright','centerleft','centercenter','centerright','bottomleft','bottomcenter','bottomright'];
    //function that adds 9 rects to element
    function addChildren(elt){
        iterations++;
        //loop through all places for rects
        rectPlaces.forEach(function(curRect){
            //create the element for this rect
            var curElt=document.createElement('div');
            //add class and id
            curElt.setAttribute('class','offsetrect');
            curElt.setAttribute('id',curRect+'offset');
            //add it to element
            elt.appendChild(curElt);
        });
        //get the element form point and its styling
        var eltFromPoint=document.elementFromPoint(event.clientX,event.clientY);
        var eltFromPointStyle=getComputedStyle(eltFromPoint);
        //Either return the element smaller than 1 pixel that the event was in, or recurse until we do find it, and return the result of the recursement
        return Math.max(parseFloat(eltFromPointStyle.getPropertyValue('height')),parseFloat(eltFromPointStyle.getPropertyValue('width')))<=1?eltFromPoint:addChildren(eltFromPoint);
    }
    //this is the innermost element
    var correctElt=addChildren(cover);
    //find the element's top and left value by going through all of its parents and adding up the values, as top and left are relative to the parent but we want relative to teh wall
    for(var curElt=correctElt,correctTop=0,correctLeft=0;curElt!==cover;curElt=curElt.parentNode){
        //get the style for the current element
        var curEltStyle=getComputedStyle(curElt);
        //add the top and left for the current element to the total
        correctTop+=parseFloat(curEltStyle.getPropertyValue('top'));
        correctLeft+=parseFloat(curEltStyle.getPropertyValue('left'));
    }
    //remove all of the elements used for testing
    cover.parentNode.removeChild(cover);
    //the returned object
    var returnObj={
        x: correctLeft,
        y: correctTop,
        iterations: iterations
    }
    return returnObj;
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

function makeColorPicker () {

	var letters = '0369CF'.split('');
    var colorA = [];
    for (var i = 0; i < 6; i++ )
    for (var j = 0; j < 6; j++ )
    for (var k = 0; k < 6; k++ ) {
    	var std = Math.abs(j-i) + Math.abs(k-i) + Math.abs(j-k);
    	var color = '#'+ letters[i]+letters[i]+letters[j]+letters[j]+letters[k]+letters[k];
    	color = 'rgb('+parseInt('0x'+letters[i]+letters[i],16)+','+parseInt('0x'+letters[j]+letters[j],16)+','+parseInt('0x'+letters[k]+letters[k],16)+')';
        if(std>8) colorA.push( color );
    }
    //push 5-level gray scale
    for(var i=0; i<=255; i+=(255/4) ){
	    colorA.push( 'rgb('+Math.round(i)+','+Math.round(i)+','+Math.round(i)+')' );
	}


    var W = $(window).width();
    //W = ~~(W / 60)*60;
    $('.colorCon').empty().width(300);
    for(i=0; i<colorA.length; i++){
		var box = $('<a href="#"></a>');
		box.css({ 'background-color': colorA[i] });
		box.data('color',  colorA[i] );
		$('.colorCon').append(box);
		box.on('click', function  (e) {
			setTool(curTool, {"stroke": $(this).data('color') } );
			$('.colorCon').hide();
			e.preventDefault();
		});
	}
}


function chooseColor () {
	$('.colorCon').show();
}



var host = "http://1111hui.com:88";
var savedCanvasData = [];
var savedSignData = [];
var savedInputData = {};

function restoreCanvas (isRender) {

  $('#drawViewer .page').each(function(){
    var page = $(this).data('page-number');
    var pageIndex = page-1;
    if(savedCanvasData[page-1]){
    	$(this).html( savedCanvasData[pageIndex] );
    }
    else{
      $(this).find('.textWrap, .shape').remove();
    }
	if(isRender) RERenderDrawerLayer( pageIndex );
  });
}



function copyDrawerLayerData(pageIndex){
  var drawCon = $('#drawViewer');
  if(typeof pageIndex=='number') drawCon = drawCon.find('.page').eq(pageIndex);
  var svgCon = $('.svgCon', drawCon).toArray();
  svgCon.forEach(function(v,i){
    var page = $(v).parent().data('page-number');
    $(v).clone().insertAfter('#pageContainer'+page+' .canvasWrapper');
  });

  var textCon = $('.textCon', drawCon).toArray();
  textCon.forEach(function(v,i){
    var page = $(v).parent().data('page-number');
	var con = $('#pageContainer'+page+' .canvasWrapper');
    $(v).clone().insertAfter(con);
    $('#pageContainer'+page).find('.textWrap[data-template]').show().html('');
  });

}

function copyInputLayerData(pageIndex){

  var page = pageIndex+1;

  var drawCon = $('#drawerLayer'+page ).find('.textCon');
  var pOff = getRealOffset( $(drawCon) );

  var inputCon = $('#inputLayer'+page ).find('.inputCon');

  var inputCon = $('#inputLayer'+page ).find('.inputCon');
  inputCon.css({ '-webkit-transform': 'scale('+ curScale +')' });

  setTimeout(function() {

    var textCon = $('[data-template]', drawCon).toArray();
    textCon.forEach(function(v,i) {
      var offset = $(v).offset();
      var id = $(v).data('id');

      var text = $('[data-input-id="'+id+'"]');

      if( !text.length ){
        text = $('<div class="userInputText"><textarea name="userinput'+i+'"></textarea></div>');
        text.data('input-id', id );
        text.appendTo( inputCon );

        function saveInputData() {
          var val =  $(this).val();
          var id = $(this).parent().data('input-id');
          if( savedInputData[id]==val ) return;
          savedInputData[id] = val;
          var inter1;
          function saveInterval(){
            $.post(host+'/saveInputData', { shareID:window.shareID, file:curFile, value:val, textID: id }, function(data){
              console.log(data);
              if(data!='OK'){
                clearTimeout(inter1);
                inter1 = setTimeout(function(){saveInterval()}, 1000);
              }
            } );
          }
          saveInterval();
        }

        text.find('textarea').off().on('keyup', $.debounce(1000, saveInputData) );
        text.find('textarea').on('change', saveInputData );
      }

      text.get(0).style.cssText = v.style.cssText;
      if( $(v).find('.text').size() )
      	text.find('textarea').get(0).style.cssText = $(v).find('.text').get(0).style.cssText;
      var t = parseTemplate( $(v).text(), v );
      t = savedInputData[id] || t;
      setInputTextValue(id, t);

      if(shareID){
      	$('body').addClass('shareMode');
      	text.find('textarea').show().prop('readonly', true);
      	text.find('select').hide();
      }

    });


  }, 50);


}

function setInputTextValue(id, val){
  var text = $('[data-input-id="'+id+'"]');
  text.find('textarea,select').val( val );
  text.find('textarea').trigger('change');
}

// Template parser:
// {param} str: [姓名]osdif[这里不会解析]oisjdofj[部门]等等
// if [keyword] not exists in TemplateField, then it will not touched.
// {param} templateEl: the element which has [data-template] attr, used as select element

function parseTemplate(str, templateEl){
	if(!str) return '';

	var repA = [];
	var re = /[\[［]([^\]］]+)[\]］]/;
	function parseT(s){
		str = s.replace(re, function(match, $1, offset, origin) {
			var para = $1.split(/[：:]/);
			var tempObj = TemplateField[para.shift()];
			var func = tempObj && tempObj.callback;
			repA.push(match);
			if(!func){
				return '{{'+repA.length+'}}';
			}
			var ret = func(para, templateEl);
			return ret;
		});
		if( re.test(str) ) parseT(str);
	}
	parseT(str);

	str = str.replace(/{{(\d+)}}/, function(match, $1, offset, origin) {
		return repA[$1-1];
	});

	return str;
}



function saveCanvas () {


	$('[data-hl]').attr('data-hl',null);

	var saveObj = $('#drawViewer .page').toArray().map(function(v){
		return $(v).html()
	});
  savedCanvasData = saveObj;

	setTimeout(function(){
		$.post( host + '/saveCanvas', { file:curFile, shareID:shareID, personName:rootPerson.name, data: JSON.stringify(saveObj) } );
	},0);

  copyDrawerLayerData();

}

function showCanvas () {

    setTool('curve');
    $('.btnCurve').addClass('active');
    startWindowEvent();

	  $('.svgCon, .textCon', $('#viewer')).remove();

	  if(!isTemplate) $('#drawViewer').find('.textWrap[data-template]').hide();

		$('#drawViewer').show();
		$('#drawTool').show();
		$('#mainMenu').hide();
		$('.textLayer').hide();

}




var optionsDrag = {
  limit: function (x,y,x0,y0) {
  	return {x:x, y:y};
  },
  setCursor: 'move',
  setPosition:false,
  useGPU:true,
  calcXY: function(me){
    return {
      left: parseInt( getComputedStyle(me.element).left ),
      top: parseInt( getComputedStyle(me.element).top )
    }
  },
  onDrag: function (element, x, y, e) {
    $(element).css('left', x);
    $(element).css('top', y);
    $('.signPadHandler').css('left', x+$(element).width());
    $('.signPadHandler').css('top', y+$(element).height());
  }
};

var optionsResize = {
  limit: function (x,y,x0,y0) {
  	var offset = getRealOffset($('.signPad') );
  	if(offset.width<118) return {x:offset.left+offset.width, y:offset.top+offset.height }
  	else return {x:x, y:y};
  },
  setCursor: 'move',
  setPosition:false,
  useGPU:true,
  calcXY: function(me){
    return {
      left: parseInt( getComputedStyle(me.element).left ),
      top: parseInt( getComputedStyle(me.element).top )
    }
  },
  onDragEnd: function(element, x, y, e) {
  	var offset = getRealOffset($('.signPad') );
  	if(offset.width<118) {
  		$('.signPad').width(118);
  		$('.signPad').height(118*456/984);
  		$(element).css('left', offset.left+118);
	    $(element).css('top', offset.top+118*456/984 );
  	}
  },
  onDrag: function (element, x, y, e) {
  	var offset = getRealOffset($('.signPad') );
    console.log(x,y);
  	var top = offset.top;
  	var left = offset.left;
  	var W = x- left;
  	var H = W*456/984;
    $(element).css('left', x);
    $(element).css('top', top +H );
    $('.signPad').css('width',  W );
    $('.signPad').css('height', H );
    if(W<180){
      $('.signPadInfo div').hide();
    }else{
      $('.signPadInfo div').show();
    }
  }
};


function getSignData (page) {
  var data = savedSignData.filter(function  (v,i) {
    return v.page==page;
  });
  return data ? data[0] : null;
}

function restoreSignature (pageIndex) {

  savedSignData.forEach(function  (v,i) {
    if(!v.sign) return true;
    var page = pageIndex+1;
    if(v.page!=page) return true;
    var scale = v.scale? window.curScale/v.scale : 1;
    //var img = $('<div class="signImg"><div class="img"></div></div>');
    var img = $('<div class="signImg"><img class="img"></div></div>');
    img.appendTo( $('#viewer .page').eq(v.page-1) );
    img.css({left:v.pos.left*scale+'px', top:v.pos.top*scale+'px', width:v.pos.width*scale+'px', height:v.pos.height*scale+'px' });
    img.find('.img').attr({ 'src': v.sign.signData });
    img.data('id', v._id);
    img.click(function(){
      if( window.isSigned ) return;
      if($(this).hasClass('active')){
        setStage('viewer');
        $(this).removeClass('active');
      }else{
        setStage('sign');
        $(this).addClass('active');
      }

    });

    if(window.signID == v._id ){
      img.click();
      var off=img.offset();
      var view = $('#viewerContainer');
      view.scrollTop(off.top+view.scrollTop() -$(window).height()/2+off.height/2);
      view.scrollLeft(off.left+view.scrollLeft() -$(window).width()/2+off.width/2);
    }

    // var r = v.sign.width/v.sign.height;
    // var h = v.pos.width;
    // var w = h*r;
    // //img.find('.img').css({'background-image': 'url('+v.sign.signData+')',  width:w+'px', height: h+'px' });

  });
}

function deleteSign(){
  var img = $('.signImg.active');
  $.post(host+'/deleteSign', {id:img.data('id')} );
  img.remove();
  setStage('viewer');
}

function finishSign(){
  $.post(host+'/finishSign', {shareID:window.shareID, person:rootPerson.userid }, function(data){
    if(data)alert(data);
  } );
  window.isSigned = true;
  $('.btnSign').hide();
  setStage('viewer');
}

function showSign(){
  var w = 200;
  var h= w*456/984;
  $('.signPad').show().css({width:w, height:h, left:$(window).width()/2-w/2, top:$(window).height()/2-h/2 });
  var offset = getRealOffset($('.signPad') );
  $('.signPadHandler').show().css({left: offset.left+offset.width, top: offset.top+offset.height });
  HandTool.handTool.activate();
  new Draggable( $('.signPad').get(0) , optionsDrag);
  new Draggable( $('.signPadHandler').get(0) , optionsResize);
}


function beginSign(){
	var padOffset = getRealOffset($('.signPad'));
	var el = $('#viewer .page').filter(function(){
		var offset = getRealOffset($(this));
		return rectsIntersect(offset, padOffset);
	});
	if(el.length>1){
		alert("签名位置不可跨越两页，请调整一下");
		return;
	}
	var offset = getRealOffset($(el[0]));
	var pos = {left: padOffset.left - offset.left, top: padOffset.top - offset.top, width: padOffset.width, height: padOffset.height };
	if(pos.left<0 || pos.top<0
		|| padOffset.width+padOffset.left> offset.left+offset.width
		|| padOffset.height+padOffset.top>offset.top+offset.height ){
		if( !confirm("签名框有部分超出页面，可能会导致签名无法全部显示"))
		return;
	}
	var page = $(el[0]).data('page-number');

	var curPage = PDFViewerApplication.pdfViewer.currentPageNumber;
	var offset = getRealOffset( $('.page').eq(curPage-1) );

	var scaleValue = PDFViewerApplication.pdfViewer.currentScaleValue;
	if(!isNaN(scaleValue)) scaleValue= Math.round(scaleValue*100);

	var hashleft = -offset.left/window.curScale;
	var hashtop = viewBox[3] + offset.top/window.curScale - 30;

	var urlhash = 'page='+page+'&zoom='+ scaleValue +','+ ~~hashleft+','+ ~~hashtop;

	var data = { signPerson:'yangjiming', shareID:window.shareID, file:window.curFile, page:page, scale:window.curScale, pos: pos, urlhash: urlhash, isMobile:isMobile };
	$.post(host+'/beginSign', {data: data} , function(data){
		if(data){
      var url = 'http://1111hui.com/pdf/webpdf/signpad.html#signID='+data+'&hash='+(+new Date());
      window.location = url;
    }
	});
}

function setStage (stat) {
  $('.active').removeClass('active');
  $('.subtool').hide();
  $('.botmenu').hide();
  $('.signImg').show();
  $('.signPad, .signPadHandler').hide();
  HandTool.handTool.deactivate();
  $('#viewerContainer').css({overflow:'auto'});
  $('#drawViewer').hide();

	switch (stat){
		case 'remark':
      		$('.signImg').hide();
			   showCanvas();
  			$('#viewerContainer').css({overflow:'hidden'});
        $('#inputViewer').hide();
  			svgHistory.update('force');
			break;
		case 'viewer':
          $('#inputViewer').show();
		      $('#drawViewer').hide();
		      $('#drawTool').hide();
		      $('#mainMenu').show();
		      $('.textLayer').show();
			break;
		case 'sign':
      		$('#signMenu').show();
			break;
	}

  if(stat!='remark'){
      endWindowEvent();
  }
	window.curStage = stat;
	updateViewArea();
}


function updateViewArea(){
	var mainHeight = $('.botmenu:visible').height()||0;
	var subHeight = $('.subtool:visible').height()||0;
	$('#viewerContainer').css({'margin-bottom': mainHeight+subHeight+'px'} );
}

function backCabinet () {
  var filename = curFile.split('/').pop();
  if(filename.match(/\.pdf$/)){
    var shareStr = shareID? '&shareID='+ shareID : '';
    window.location = "http://1111hui.com/pdf/client/tree.html#path="+filename +shareStr;
  }
}



$(function  () {
  makeColorPicker();
  makeTemplatePicker();
  setStage('viewer');

  $('.button').on(downE, function  (e) {
    e.stopPropagation();
    $(this).parent().children().removeClass('active');
    $(this).addClass('active');
    var evt = /touch/.test(e.type) ? e.touches[0] : e;
    eval( $(evt.target).data('onclick') );
    if( !$(this).hasClass('btnColorCon') ) setTimeout(function(){ $('.colorCon').hide(); }, 200);

  } );

  var startDist = 0;
  var touchEvent = new $.TouchEvent({
      targetSelector: '#viewer',
      startCallback: function(e){
        var _this = this;
        startDist = 0;
        setTimeout(function(){
          if(_this.touches>1) startDist = _this.moveDist;
          else startDist = 0;
        }, 50);
      },
      endCallback: function(e){
        var _this = this;
        var changeDist = 0;
        if(startDist && _this.touches && _this.changedTouches ){
          changeDist = (  _this.moveDist - startDist );
          var scale= 1 + changeDist/ $(window).width();
          window.curScale = PDFViewerApplication.pdfViewer.currentScale;
          //debug(window.curScale, scale)
          if(changeDist && scale) PDFViewerApplication.setScale( window.curScale*scale , false);
        }

      },
      moveCallback: function(e){
        var _this = this;
      }
    });

  var urlObj = searchToObject(window.location.hash);
  window.curFile = urlObj.file;
  window.shareID = urlObj.shareID;
  window.isSign = urlObj.isSign;
  window.isTemplate = urlObj.isTemplate;
  window.signID = urlObj.signID;
  window.isSigned = false;
  window.shareData = null;

  if(!window.isSign) $('.btnSign').hide();

  $.post( host + '/getCanvas', { file:curFile, shareID:shareID }, function(data){
    if(data) savedCanvasData = JSON.parse( data );
  } );

  $.post( host + '/getSavedSign', { file:curFile, shareID:shareID }, function(data){
    if(data && data.map) savedSignData = data;
  } );

  $.post( host + '/getInputData', { file:curFile, shareID:shareID }, function(data){
    if(data) savedInputData = data;
  } );


  $.post( host + '/getShareData', { shareID:shareID }, function(data){
    if(data)   window.shareData = data;
    else return;

    var t = data.toPerson.filter(function(v){
      return v.userid == rootPerson.userid && v.isSigned
    });

    if(t.length){
       window.isSigned = true;
       //alert('您已签署过此文档');
    }else if(isSign) {
      $('.btnSign').css({display: 'table-cell' });
    }
  } );


});


function searchToObject(search) {
  return search.substring(1).split("&").reduce(function(result, value) {
    var parts = value.split('=');
    if (parts[0]) result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    return result;
  }, {})
}



var rootPerson = {userid: 'yangjiming', name:"杨吉明", depart:"行政" };

var TemplateField = {
	'姓名':{demo:"[姓名]", callback: function(){
		return rootPerson.name;
	}},
	'部门':{demo:"[部门]", callback: function(){
		return rootPerson.depart;
	}},
	'年':{demo:"[年]", callback: function(){
		return moment().format('YYYY');
	}},
	'月':{demo:"[月]", callback: function(){
		return moment().format('MM');
	}},
	'日':{demo:"[日]", callback: function(){
		return moment().format('DD');
	}},
	'可':{demo:"[可]", callback: function(a){
		return a.join();
	}},
	'列表':{demo:"[列表:部门1,部门2]", callback: function(a, el){
		a=a[0].split(/[,，]/);
		var id = $(el).data('id');
		var inputCon = $('[data-input-id="'+id+'"]');
		var textarea = inputCon.find('textarea');

    var sel = $('[data-text-id="'+id+'"]');
    if (!sel.length){
  		sel = $('<select></select>');
  		sel.data('text-id', id);
      sel.appendTo( inputCon );
    }
    sel.html('<option value="">请选择</option>');

		a.forEach(function(v){
			var option = $('<option>'+v+'</option>');
			sel.append(option);
		});
		sel.off().change(function(){
			textarea.val( $(this).val() );
        textarea.trigger('change');
		});
		textarea.hide();
		sel.get(0).style.cssText = $(el).find('pre').get(0).style.cssText;
		return '';
	}},

}



function insertAtCursor(myField, myValue) {
    //IE support
    if (document.selection) {
        myField.focus();
        sel = document.selection.createRange();
        sel.text = myValue;
    }
    //MOZILLA and others
    else if (myField.selectionStart || myField.selectionStart == '0') {
        var startPos = myField.selectionStart;
        var endPos = myField.selectionEnd;
        myField.value = myField.value.substring(0, startPos)
            + myValue
            + myField.value.substring(endPos, myField.value.length);
    } else {
        myField.value += myValue;
    }
}
function makeTemplatePicker(){
	var ul = $('<ul class="templateUL clearfix"></ul>');

	$.each(TemplateField, function(k,v) {
		var li = $('<li class="templateLI"></li>').appendTo(ul);
		li.text(v.demo);
		li.click(function(){
			//$('.textarea').val( $(this).text() );
			insertAtCursor( $('.textarea').get(0), $(this).text() );
			$('.templateCon').trigger('dialog-close');
		});
	});
	$('.templateCon').empty().append(ul);
}


function chooseTemplate(){
	$('.templateCon').trigger('dialog-open');
}


