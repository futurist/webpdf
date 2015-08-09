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
var signID = searchToObject(window.location.search).signID;

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

if(signID) initSignPad();
else alert('请求非法');

window.signHisID = '';

function initSignPad(){
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
              
            var data = window.signHisID? { signID:signID, hisID: window.signHisID} : {data: signData, width:canvas.width, height:canvas.height, signID:signID};
            $.post( 'http://1111hui.com:88/saveSign', data , function(data){
                if(data){
                    alert( window.signHisID?'签名应用成功，确定后返回文档': '签名应用成功，并保存到历史签名。确定后返回文档');
                    window.location = 'http://1111hui.com/pdf/webpdf/viewer.html?file='+data.file+'&isSign=1&shareID='+data.shareID+'#'+data.urlhash.replace('#','');
                }
            });            
        }
    });

    $('.cancel').click(function(){
        window.close();
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
            $.post( 'http://1111hui.com:88/getSignHistory', {signID:signID}, function(data){
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