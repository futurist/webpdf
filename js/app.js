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


var signID = searchToObject(window.location.search).signID;

// Adjust canvas coordinate space taking into account pixel ratio,
// to make it look crisp on mobile devices.
// This also causes canvas to be cleared.
function resizeCanvas() {
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

        var img = new Image();
        img.onload = function(){
            var canvas = document.createElement("canvas");
              canvas.height = img.width;
              canvas.width = img.height;
              var ctx = canvas.getContext("2d");
              ctx.rotate(90 * Math.PI / 180);
              ctx.translate(0, -canvas.width);
              //..check orientation data, this code assumes the case where its oriented 90 degrees off
              ctx.drawImage(img, 0, 0);
              var signData = canvas.toDataURL("image/png");
              
                var data = window.signHisID? { signID:signID, hisID: window.signHisID} : {data: signData, width:canvas.width, height:canvas.height, signID:signID};
                $.post( 'http://1111hui.com:88/saveSign', data , function(data){
                    console.log(data);
                });

          }
          img.src=signPAD.toDataURL();
            
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
        signPAD.fromDataURL( $('img.active').attr('src') );
        window.signHisID = $('img.active').data('hisID');
    });

    $('.history').click(function(){
        if( !signPAD.isEmpty() && !confirm('已绘制的签名会被清除，确定继续？'))return;
        $('.historyLayer').show();
        $('.drawerMenu').hide();
        $('.historyMenu').show();
        $('.historyLayer').empty();
        $.post( 'http://1111hui.com:88/getSignHistory', {signID:signID}, function(data){
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
                    img.click(function(){
                        $('.historyLayer img').removeClass('active');
                        $(this).addClass('active');
                    });
                });
            } else {
                alert("还没有历史签名");
                $('.hisBack').click();
            }
        });
    });

}


$('.historyMenu').hide();
$('.historyLayer').hide();