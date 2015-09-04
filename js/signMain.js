
var isAndroid = /(android)/i.test(navigator.userAgent);
var isWeiXin = navigator.userAgent.match(/MicroMessenger\/([\d.]+)/i);
var isiOS = /iPhone/i.test(navigator.userAgent) || /iPod/i.test(navigator.userAgent) || /iPad/i.test(navigator.userAgent);
var isMobile = isAndroid||isWeiXin||isiOS;

var wxUserInfo={};
var wxOAuthUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx59d46493c123d365&redirect_uri=http%3A%2F%2F1111hui.com%2F/pdf/getUserID.php&response_type=code&scope=snsapi_base&state='+ encodeURIComponent( window.location.href.replace('#','{@@@}') ) +'#wechat_redirect';
var DEBUG= 1;
if(!DEBUG)
{

$(function(){
 wxUserInfo = Cookies.get( 'wxUserInfo' );
if( !wxUserInfo ){
  window.location = wxOAuthUrl;
} else {
   wxUserInfo = JSON.parse(wxUserInfo);
}
});

}else{
  wxUserInfo.UserId = 'yangjiming';
}


FILE_HOST = 'http://7xkeim.com1.z0.glb.clouddn.com/';

var wrapper = document.getElementById("signature-pad"),
    clearButton = wrapper.querySelector("[data-action=clear]"),
    saveButton = wrapper.querySelector("[data-action=save]"),
    signCanvas = wrapper.querySelector("canvas"),
    signPAD;

$('.m-signature-pad--footer').width( $('.m-signature-pad--body').height()-40 );

function searchToObject(search) {
  return search.substring(1).split("&").reduce(function(result, value) {
    var parts = value.split('=');
    if (parts[0]) result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    return result;
  }, {})
}


window.scaleRatio = 456/984;
window.historyData = null;
var signID = searchToObject(window.location.hash).signID;
var fileKey = searchToObject(window.location.hash).fileKey;
var shareID = searchToObject(window.location.hash).shareID;
var signIDX = searchToObject(window.location.hash).idx;
var hash = searchToObject(window.location.hash).hash;

// Adjust canvas coordinate space taking into account pixel ratio,
// to make it look crisp on mobile devices.
// This also causes canvas to be cleared.
function resizeCanvas() {

    var w = signCanvas.offsetHeight * window.scaleRatio + 58;
    $('#signature-pad').width( w );

    // When zoomed out to less than 100%, for some very strange reason,
    // some browsers report devicePixelRatio as less than 1
    // and only part of the canvas is cleared then.
    var ratio =  Math.max(window.devicePixelRatio || 1, 1);
    signCanvas.width = signCanvas.offsetWidth * ratio;
    signCanvas.height = signCanvas.offsetHeight * ratio;
    signCanvas.getContext("2d").scale(ratio, ratio);

}

window.onresize = resizeCanvas;
resizeCanvas();

if(signID && wxUserInfo.UserId) initSignPad();
else alert('请求非法');

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


            var canvas = document.createElement("canvas");
              canvas.height = signCanvas.width;
              canvas.width = signCanvas.height;
              var ctx = canvas.getContext("2d");
              ctx.rotate(90 * Math.PI / 180);
              ctx.translate(0, -canvas.width);
              //..check orientation data, this code assumes the case where its oriented 90 degrees off
              ctx.drawImage(signCanvas, 0, 0);
              var signData = canvas.toDataURL("image/png");
              
            var data = window.signHisID? { signID:signID, fileKey:fileKey, shareID:shareID, hisID: window.signHisID, signIDX:signIDX} : {data: signData, width:canvas.width, height:canvas.height, signID:signID,  fileKey:fileKey, shareID:shareID, signIDX:signIDX };

            data.signPerson = wxUserInfo.UserId;

            $.post( 'http://1111hui.com:88/saveSign', data , function(data){
                
                // return console.log(data);

                if(data){
                    //data = data.signIDS.filter(function(v){ return v._id == signID  }  ).shift();
                    alert( window.signHisID?'签名应用成功，确定后返回文档': '签名应用成功，并保存到历史签名。确定后返回文档');
                    var url = 'http://1111hui.com/pdf/webpdf/viewer.html#file='+ FILE_HOST+fileKey +'&isSign=1&signID='+ signID +'&shareID='+(shareID||'')+'&pos='+data.urlhash.replace('#','');
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

        var canvas = document.createElement("canvas");
        canvas.height = W;
        canvas.width = H;
        var ctx = canvas.getContext("2d");
        ctx.rotate(-90 * Math.PI / 180);
        ctx.translate(-W, 0);
        ctx.drawImage(img.get(0), 0, 0);


        signPAD.fromDataURL( canvas.toDataURL() );
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
            $.post( 'http://1111hui.com:88/getSignHistory', {signID:signID, person: wxUserInfo.UserId }, function(data){
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