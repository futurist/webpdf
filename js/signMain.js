


function searchToObject(search) {
  return search.substring(1).split("&").reduce(function(result, value) {
    var parts = value.split('=');
    if (parts[0]) result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    return result;
  }, {})
}

var urlObj = searchToObject(window.location.hash);
window.SIGN_RATIO = 496/984;
window.historyData = null;
var signID = urlObj.signID;
var fileKey = urlObj.fileKey;
var shareID = urlObj.shareID;
var signIDX = urlObj.idx;
var hash = urlObj.hash;
var curFlowPos = urlObj.curFlowPos;




var isAndroid = /(android)/i.test(navigator.userAgent);
var isWeiXin = navigator.userAgent.match(/MicroMessenger\/([\d.]+)/i);
var isiOS = /iPhone/i.test(navigator.userAgent) || /iPod/i.test(navigator.userAgent) || /iPad/i.test(navigator.userAgent);
var isMobile = isAndroid||isWeiXin||isiOS;

var wxUserInfo={};
var wxOAuthUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx59d46493c123d365&redirect_uri=http%3A%2F%2F1111hui.com%2F/pdf/getUserID.php&response_type=code&scope=snsapi_base&state='+ encodeURIComponent( window.location.href.replace('#','{@@@}') ) +'#wechat_redirect';
var DEBUG= 0;
if(isWeiXin)
if(!DEBUG)
{

$(function(){
 wxUserInfo = Cookies.get( 'wxUserInfo' );

if( !wxUserInfo ){
  window.location = wxOAuthUrl;
} else {
   wxUserInfo = JSON.parse(wxUserInfo);

    if(signID && wxUserInfo.UserId) {
        $.post(host+'/getSignStatus', {curFlowPos:curFlowPos, shareID:shareID, t: Math.random() }, function  (ret) {
            if(ret==0) {
                $('.drawerMenu').show();
                initSignPad();
            } else {
                alert('您已签署过此文档');
                isWeiXin? wx.closeWindow() : window.close();
                // var url = 'http://1111hui.com/pdf/webpdf/viewer.html#file='+ FILE_HOST+fileKey +'&isSign=1&signID='+ signID +'&shareID='+(shareID||'');
                // window.location = url;
            }
        });

    }
    else alert('请求非法');
}
});

}else{
  wxUserInfo.UserId = 'yangjiming';
}


var windowRatio = $(window).width()/$(window).height();
var host = 'http://1111hui.com:88';

FILE_HOST = 'http://7xkeim.com1.z0.glb.clouddn.com/';

var wrapper = document.getElementById("signature-pad"),
    clearButton = wrapper.querySelector("[data-action=clear]"),
    saveButton = wrapper.querySelector("[data-action=save]"),
    signCanvas = wrapper.querySelector("canvas"),
    signPAD;

$('.m-signature-pad--footer').width( $('.m-signature-pad--body').height()-40 );

// Adjust canvas coordinate space taking into account pixel ratio,
// to make it look crisp on mobile devices.
// This also causes canvas to be cleared.
function resizeCanvas() {

	windowRatio = $(window).width()/$(window).height();
	var $pad = $('#signature-pad').removeAttr('style');

	setTimeout(function  () {
		if( windowRatio<1 ){

			var w = $pad.data('width') || signCanvas.offsetHeight * window.SIGN_RATIO + 58;
			$pad.width( w ).data('width', w);

			$('body').removeClass().addClass('portrait');

		} else {

			var w = $pad.data('height') || signCanvas.offsetWidth * window.SIGN_RATIO + 58;
			$pad.height( w ).data('height', w);

			$('body').removeClass().addClass('landscape');
		}


		// When zoomed out to less than 100%, for some very strange reason,
		// some browsers report devicePixelRatio as less than 1
		// and only part of the canvas is cleared then.
		var ratio =  Math.max(window.devicePixelRatio || 1, 1);
		signCanvas.width = signCanvas.offsetWidth * ratio;
		signCanvas.height = signCanvas.offsetHeight * ratio;
		signCanvas.getContext("2d").scale(ratio, ratio);

	}, 30);

}

window.onresize = resizeCanvas;
resizeCanvas();



window.signHisID = '';

function initSignPad(){

    if(!wxUserInfo.UserId) return alert('无法获取身份信息');

    signPAD = new SignaturePad(signCanvas);
    signPAD.onBegin = function(e){
        window.signHisID = '';
    }
    clearButton.addEventListener("click", function (event) {
        signPAD.clear();
        window.signHisID = '';
    });

    saveButton.addEventListener("click", function (event) {
        if (signPAD.isEmpty()) {
            alert("请签名后再保存.");
        } else {
            $('.drawerMenu').hide();
            //saveButton.setAttribute('disabled', 'disabled');

            if(windowRatio<1){
            	var canvas = document.createElement("canvas");
            	canvas.height = signCanvas.width;
            	canvas.width = signCanvas.height;
            	var ctx = canvas.getContext("2d");
            	ctx.rotate(90 * Math.PI / 180);
            	ctx.translate(0, -canvas.width);
            	//..check orientation data, this code assumes the case where its oriented 90 degrees off
            	ctx.drawImage(signCanvas, 0, 0);
            	var signData = canvas.toDataURL("image/png");
            } else {
            	var canvas = $('.m-signature-pad--body canvas').get(0);
            	var signData = signPAD.toDataURL();
            }


            var data = window.signHisID? { signID:signID, fileKey:fileKey, shareID:shareID, hisID: window.signHisID, signIDX:signIDX} : {data: signData, width:canvas.width, height:canvas.height, signID:signID,  fileKey:fileKey, shareID:shareID, signIDX:signIDX };

            data.signPerson = wxUserInfo.UserId;
            data.curFlowPos = curFlowPos;

            $.post( host+ '/saveSign', data , function(ret){

                // return console.log(ret);
                if(!ret){
                    $('.drawerMenu').show();
                    return alert('签名保存失败');
                }
                if(ret){
                    //ret = ret.signIDS.filter(function(v){ return v._id == signID  }  ).shift();
                    //alert( window.signHisID?'签名应用成功，确定后返回文档': '签名应用成功，并保存到历史签名。确定后返回文档');
                    var url = 'http://1111hui.com/pdf/webpdf/viewer.html#file='+ FILE_HOST+fileKey +'&isSign=1&signID='+ signID +'&shareID='+(shareID||'')+'&pos='+ret.urlhash.replace('#','');
                    window.location = url;
                }
            });
        }
    });

    $('.cancel').click(function(){
        if(isWeiXin)  return wx.closeWindow();
        window.history.length>1 ? window.history.go(-1) : window.close() ;
        //window.close();
    });

    $('.hisBack').click(function(){
        $('.historyLayer').hide();
        $('.drawerMenu').show();
        $('.historyMenu').hide();
    });

    $('.hisOK').click(function(){
        $('.hisBack').click();

        var img = $('img.active');
        var W = eval(img.data('width'));
        var H = eval(img.data('height'));
        img.css('width', W);
        img.css('height', H);

        if(windowRatio<1){

	        var canvas = document.createElement("canvas");
	        canvas.height = W;
	        canvas.width = H;
	        var ctx = canvas.getContext("2d");
	        ctx.rotate(-90 * Math.PI / 180);
	        ctx.translate(-W, 0);
	        ctx.drawImage(img.get(0), 0, 0);
	        signPAD.fromDataURL( canvas.toDataURL() );

	    } else {

	    	var canvas = document.createElement("canvas");
	    	canvas.height = H;
	    	canvas.width = W;
	    	var ctx = canvas.getContext("2d");
	    	ctx.drawImage(img.get(0), 0, 0);
	    	signPAD.fromDataURL( canvas.toDataURL() );

	    }


        window.signHisID = $('img.active').data('hisID');
    });

    $('.history').click(function(){
        if( !signPAD.isEmpty() && !confirm('已绘制的签名会被清除，确定继续？'))return;
        $('.historyLayer').show();
        $('.drawerMenu').hide();
        $('.historyMenu').show();
        $('.historyLayer').empty();
        if(window.historyData){
            displayHistory(window.historyData);
        } else {
            $.post( host+ '/getSignHistory', {signID:signID, person: wxUserInfo.UserId }, function(data){
                window.historyData = data;
                displayHistory(data);
            });
        }
    });

}


function displayHistory (data) {
    if(data && data.forEach && data.length>0){
        signPAD.clear();
        data.forEach(function(v){
            var w = $(signCanvas).width();
            var h = $(signCanvas).height();
            if(v.width&&v.height){
                var r = w/v.width;
                h = r*v.height;
            }
            var img = $('<img class="thumb" src="'+ v.signData +'" width="'+w+'" height="'+h+'" />');
            $('.historyLayer').append(img);
            img.data('hisID', v._id);
            img.data('width', v.width);
            img.data('height', v.height);
            img.click(function(){
                $('.historyLayer img').removeClass('active');
                $(this).addClass('active');
            });
        });
    } else {
        alert("还没有历史签名");
        $('.hisBack').click();
    }
}

$('.historyMenu').hide();
$('.historyLayer').hide();

window.addEventListener('orientationchange', function () {
    updateOritation();

}, true);

function updateOritation () {
    $('body').removeClass();
    if (window.orientation == -90) {
        $('body').addClass('landscape rotate-90');
    }
    if (window.orientation == 90) {
        $('body').addClass('landscape rotate90');
    }
    if (window.orientation == 0) {
        $('body').addClass('portrait rotate0');
    }
    if (window.orientation == 180) {
        $('body').addClass('portrait rotate180');
    }
}
updateOritation();




