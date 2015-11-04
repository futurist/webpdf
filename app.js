

// require header
var crypto = require('crypto');
var qiniu = require('qiniu');
var moment = require('moment');
var path = require('path');

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fork = require('child_process').fork;

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');
var assert = require('assert');

var fs = require('fs');
var util = require('util');
var url = require('url');
var request = require('request');

var urllib = require("urllib");
var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var multer = require("multer");
var session = require('express-session')

var Datauri = require('datauri');
var QREncoder = require('qr').Encoder;
var mime = require('mime');
var handlebars = require('express-handlebars');
var flash = require('connect-flash');


var redis = require("redis"),
redisClient = redis.createClient(6379, '127.0.0.1', {});

qiniu.conf.ACCESS_KEY = '2hF3mJ59eoNP-RyqiKKAheQ3_PoZ_Y3ltFpxXP0K';
qiniu.conf.SECRET_KEY = 'xvZ15BIIgJbKiBySTV3SHrAdPDeGQyGu_qJNbsfB';
QiniuBucket = 'bucket01';

FILE_HOST = 'http://7xkeim.com1.z0.glb.clouddn.com/';
TREE_URL = "http://1111hui.com/pdf/client/tree.html";
VIEWER_URL = "http://1111hui.com/pdf/webpdf/viewer.html";
SHARE_MSG_URL = "http://1111hui.com/pdf/client/sharemsg.html";
IMAGE_UPFOLDER = 'uploads/' ;
var regex_image= /(gif|jpe?g|png|bmp)$/i;


var fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGE_UPFOLDER)
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

var fileUploader = multer({ storage: fileStorage })

// https://medium.com/@garychambers108/better-logging-in-node-js-b3cc6fd0dafd
function replaceConsole () {
  ["log", "warn", "error"].forEach(function(method) {
      var oldMethod = console[method].bind(console);
      console[method] = function() {
          var arg=[moment().format('YYYY-MM-DD HH:mm:ss.SSS')];
          // var arg=[new Date().toISOString()];
          for(var i in arguments){
            arg.push(arguments[i]);
          }
          oldMethod.apply(console, arg );
      };
  });
}
replaceConsole();


function safeEval (str) {
  try{
    var ret = JSON.parse(str);
  }catch(e){
    ret = str
  }
  return /object/i.test(typeof ret) ? (ret===null?null:str) : ret;
}


// helpers
var futurist = {};

futurist.array_unique = function(array) {
  var a = [], i, j, l, o = {};
  for(i = 0, l = array.length; i < l; i++) {
    if(o[JSON.stringify(array[i])] === undefined) {
      a.push(array[i]);
      o[JSON.stringify(array[i])] = true;
    }
  }
  return a;
};
// remove item from array
futurist.array_remove = function(array, from, to) {
  var rest = array.slice((to || from) + 1 || array.length);
  array.length = from < 0 ? array.length + from : from;
  array.push.apply(array, rest);
  return array;
};
// remove item from array
futurist.array_remove_item = function(array, item) {
  var tmp = array.indexOf(item)>-1;
  return tmp !== -1 ? futurist.array_remove(array, tmp) : array;
};

function NewID () {
  return +new Date()+'_'+Math.random().toString().slice(2,5);
}

function qiniu_getUpToken() {
	var responseBody =
	{
	    "shareID":"$(x:shareID)",
	    "srcPath":"$(x:path)",
		"key":"$(key)",
		"hash":"$(hash)",
		"imageWidth":"$(imageInfo.width)",
		"imageHeight":"$(imageInfo.height)",
		type:"$(type)",
		// client:client,
		// title:title,
		fname:"$(fname)",
		fsize:"$(fsize)"
	};

	var putPolicy = new qiniu.rs.PutPolicy(
		QiniuBucket,
		null,
		null,
		null,
		JSON.stringify( responseBody )
	);

	var uptoken = putPolicy.token();
	return uptoken;
}


function safeEvalObj (ret, keepNull) {
	var obj = {};
  for(var i in ret){
  	var val = safeEval(ret[i]);
    if( keepNull || val!==null||val!==undefined ) obj[i] = val;
  }
  return obj;
}


function qiniu_uploadFile(file, fileKey, callback ) {

	if(typeof fileKey=='function') {
		callback = fileKey;
		fileKey = null;
	}

	var ext = path.extname(file);
	var saveFile = fileKey || path.basename(file); //formatDate('yyyymmdd-hhiiss') + Math.random().toString().slice(1,5) + ext;

	var uptoken = qiniu_getUpToken();

	//console.log( uptoken,saveFile, file );

	qiniu.io.putFile(uptoken, saveFile, file, null, function(err, ret) {
	  if(err) return console.log(err, ret);

	  // ret.person = "yangjiming";
	  // ret.savePath = savePath;
	  //ret.path = "/abc/";
	  ret = safeEvalObj(ret);
	  console.log(ret);

	  if(callback) callback( ret );

	});

}


/********* Net Socket Part ************/
// server
require('net').createServer(function (socket) {
    //console.log("connected");
	socket.on('error', function(err){
        //console.log(err);
    });
    socket.on('data', function (data) {
        console.log(data.toString());
    });
})
//.listen(81, function(){ console.log('socket ready') });



/********* Redis Part ************/
redisClient.on('error', function (err) {
    console.log('Redis Error ' + err);
});

redisClient.on('connect', function(err){
  console.log('Connected to Redis server' + err);
});



/********* WebSocket Part ************/
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 3000 });

// each of WSMSG object structure:
// { msgid: { ws, data  }  }, such as below:
//
// { "142342.453":
//     {
//       timeStamp:+new Date(),
//       ws:[ws object],
//       data:[json data from client]
//     }
// }


var JOBS = {};  // store printer jobs same format as WSMSG
var WSMSG = {}; // store client persistent message
var WSCLIENT = {};
wss.on('connection', function connection(ws) {

  // https://github.com/websockets/ws/issues/361
  // https://github.com/websockets/ws/issues/117
  //console.log(_.keys(ws._sender));

  ws.on('close', function incoming(code, message) {
    //console.log("WS close: ", code, message);

    // Find clientName from ws
    var clientName = _.findKey(WSCLIENT, function(v){ return v.ws&&v.ws==ws } );
    console.log('client leave:', clientName, code, message);
    delete WSCLIENT[clientName];

    //_.where( WSCLIENT, {ws:ws} ).forEach();
    // _.where( WSCLIENT, {ws:ws} ).forEach(function(v){
    //     var idx = WSCLIENT.indexOf(v);
    //     if(idx>-1) WSCLIENT.splice( idx , 1  );
    //   });
  });
  ws.on('ping', function incoming(data) {
    //console.log(data.toString());
  });
  ws.on('message', function incoming(data) {
    // Client side data format:
    // reqData = {  msgid:14324.34, data:{a:2,b:3}  }

    // Server response data format:
    // resData = { msgid:14324.34, result:{ userid:'yangjiming' } }
    try{
      var msg = JSON.parse(data);
    } catch(e){
      return console.log(data);
    }

    if(msg.type=='clientConnected' && msg.clientName && msg.clientRole){

      // msg format: { clientName:clientName, clientRole:'printer', clientOrder:1 }
      var suffix = (msg.from? ':'+msg.from: '');
      var clientFullName = msg.clientName+suffix;
      if(WSCLIENT[clientFullName]) return;

      console.log( 'client up', clientFullName );
      WSCLIENT[clientFullName] = _.extend( msg, {ws:ws, timeStamp:+new Date()} );

      if(msg.clientRole == 'printer') {

          col.update({role:'printer', 'printerList.userid': msg.clientName }, { $set:{ role:'printer', 'printerList.$.userid': msg.clientName, 'printerList.$.client': msg.hostName,  'printerList.$.ip': msg.ip } }, {upsert:1}, function(err, ret){
            if(err) {
              console.log('ERROR update printer ip:', msg.clientName, msg.hostName);
              return res.send('');
            }
            console.log('updated printer ip:', msg.clientName, msg.hostName, msg.ip);
          });

      }

      return;
    }

    if(msg.type=='printerMsg' && msg.msgid) {
      var res = JOBS[msg.msgid].res;
      console.log('job:', msg.printerName, msg.data.key, msg.errMsg);
      if(! res.finished) res.send( msg );
      return;
    }

    var msgid = msg.msgid;
    if(msgid){
        delete msg.msgid;
        console.log(msgid, msg);
        WSMSG.msgid = {ws:ws, timeStamp:+new Date(), data:msg.data};
    }


  });

  // https://github.com/websockets/ws/issues/338
  console.log('ws new client connected',  ws._socket.remoteAddress, ws._socket.remotePort ) ;
  ws.send('connected');
});

function wsSendClient (clientName, msg) {
  console.log('wssend', clientName);
  var lastClient;
  ['',':mobile',':pc'].forEach(function sendToClient (v) {
    var client = WSCLIENT[clientName+v];
    if(!client || !client.ws) return true;
    msg.clientName = clientName;

    client.ws.send( JSON.stringify(msg)  );
    lastClient = client;
  });

  return lastClient;
}

function choosePrinter () {
  var printers = _.sortBy( _.where(WSCLIENT, {clientRole:'printer'}) , 'clientOrder'  );
  return printers.length ? printers[0] : null;
}

function wsSendPrinter (msg, printerName, res) {

  if(!printerName) {

    var printer = choosePrinter();
    if(!printer) return res.send('');

    printerName = printer.clientName;
  }

  var client = wsSendClient(printerName, msg);

  if(!client) return res.send('');

  JOBS[msg.msgid] = { ws:client.ws, res:res, printerName:client.clientName, timeStamp:+new Date(), data:msg};

  return printerName;

}


function wsBroadcast(data) {
  if( data.role=='upfile' ){
    return wsSendClient(data.person, data);
  }

  wss.clients.forEach(function each(client) {
    try{
      client.send( JSON.stringify(data)  );
    }catch(e) { console.log('err send ws', data) }
  });
};

function getWsData(msgid){
  if(!msgid || !WSMSG.msgid) return;
  return WSMSG.msgid.data;
}
function sendWsMsg(msgid, resData) {
  if(!msgid || !WSMSG.msgid) return;
  var ws = WSMSG.msgid.ws;

  //the sendback should be JSON stringify, else throw TypeError: Invalid non-string/buffer chunk
  var ret = { msgid:msgid, result: resData };
  try{
	  ws.send( JSON.stringify(ret)  );
	}catch(e){

	}
}

/**** Client Side example :
// Dependency: https://github.com/joewalnes/reconnecting-websocket

var wsQueue={};
var ws;
function connectToWS(){
  if(ws) ws.close();
  ws = new ReconnectingWebSocket('ws://1111hui.com:3000', null, {debug:false, reconnectInterval:300 });
  ws.onopen = function (e) {
    ws.onmessage = function (e) {
      console.log(e.data);

      if(e.data[0]!="{")return;
          var d=JSON.parse(e.data);
          var callObj= wsQueue[d.msgid];
          if(callObj) {
              callObj[1].call(callObj[0], d.result);
              delete wsQueue[d.msgid];
          }
    }
    ws.onclose = function (code, reason, bClean) {
      console.log("ws error: ", code, reason, bClean);
    }
    console.log('client ws ready');
  }
}
connectToWS();


function wsend(data, that, callback){
  if(!ws || ws.readyState!=1) return;
  var json = {data:data};
  if(callback){
      json.msgid = +new Date() + Math.random();
      wsQueue[json.msgid] = [that, callback];
  }


  ws.send(JSON.stringify(json));
  return json.msgid;
}

********/


/********* Express Part ************/

var app = express();

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Range, Content-Disposition, Content-Description, X-Requested-With,X-File-Type,Origin,Accept,*');
    res.header('Access-Control-Allow-Credentials', 'true');

    next();
}
app.use(allowCrossDomain);

app.set('views', path.join(__dirname, 'client'));
app.engine('hbs', handlebars({
  extname: '.hbs'
}));
app.set('view engine', 'hbs');


app.use(cookieParser(
	"theunsecuritykey837",
	{
		path:'/',
		expires:moment().add(1, 'days')
	}
));
app.use(session({
  secret: 'theunsecuritykey837',
  resave: false,
  saveUninitialized: true,
  cookie: { path: '/', secure: false, maxAge: 600 }
}));

app.use(bodyParser.urlencoded({limit: '2mb', extended: true })); // for parsing application/x-www-form-urlencoded
app.use(bodyParser.json({limit: '2mb'}));
app.use(flash());


//app.use(multer()); // for parsing multipart/form-data

var DOWNLOAD_DIR = './downloads/';

app.get("/listStuff", function (req, res) {
  res.render( 'views/listStuff.hbs' );
});
app.get("/listClient", function (req, res) {
  var clients = [];

  _.each( WSCLIENT, function (v, k) {
    var user = {wsClient:k};
    user =_.extend(user, getUserInfo( k.split(':').shift() ) );
    clients.push(user);
  });

  // console.log('listClient', clients);
  res.render( 'views/listClient.hbs', {clients:clients} );

});

app.get("/app.js", function (req, res) {
	res.end();
});


app.get("/main.html", function (req, res) {
  res.render('main',{
    abc:1
  });
});

app.post("/pdfCanvasDataLatex", function (req, res) {
  res.send("You sent ok" );
  //wsBroadcast(req.body);
  var data = req.body;
  var src = data.src.replace(/^data:image\/png+;base64,/, "").replace(/ /g, '+');

  fs.writeFile('aaa.png', src, 'base64', function(err) {
      assert.equal(null, err);
      var px = 72.27/72;
      data.pdfWidth *= px;
      data.pdfHeight *= px;
      var scale = data.pdfWidth/data.pageWidth;
      var X=data.offLeft*scale;
      var Y=data.offTop*scale;
      var W=data.imgWidth*scale;
      var cmd = 'xelatex "\\def\\WIDTH{'+data.pdfWidth+'pt} \\def\\HEIGHT{'+data.pdfHeight+'pt} \\def\\X{'+X+'pt} \\def\\Y{'+Y+'pt} \\def\\W{'+W+'pt} \\def\\IMG{'+'aaa.png'+'} \\input{imagela.tex}"';
      console.log(cmd);
      exec(cmd, function(err,stdout,stderr){
        console.log(stderr);
        genPDF("font", 'imagela', data.page, "out");
      });
  });
});





app.post("/getUpToken", function (req, res) {
	res.send( qiniu_getUpToken() );
});


function updateStuffInfo (person, obj) {
	STUFF_LIST && STUFF_LIST.some(function  (v) {
      if(v.userid==person){
      	_.each(obj, function  (val, key) {
      		v[key] = val;
      	});
        return true;
      }
    });

    COMPANY_TREE && COMPANY_TREE.some(function  (v) {
      if(v.userid==person){
        _.each(obj, function  (val, key) {
      		v[key] = val;
      	});
        return true;
      }
    });
}

app.post("/updatePass", function (req, res) {
  var pass = req.body.pass;
  var person = req.body.person;
  var md5 = crypto.createHash('md5'), md5Str = md5.update(pass).digest('hex');
  col.updateOne({ role:'stuff', 'stuffList.userid':person }, {$set: {'stuffList.$.lockPass': md5Str} }, function(err,ret){
  	if(err) res.end();
  	if(!ret.result.nModified) {
  		res.end();
  	} else {

	    updateStuffInfo( person, {lockPass: md5Str} );

  		res.send(md5Str);
  	}
  });

});

app.post("/unlockScreen", function (req, res) {
  var pass = req.body.pass;
  var person = req.body.person;
  var md5 = crypto.createHash('md5'), md5Str = md5.update(pass).digest('hex');

  col.updateOne({ role:'stuff', 'stuffList.userid':person, 'stuffList.lockPass': md5Str }, {$set: {'stuffList.$.isLocked': false} }, function(err,ret){
  	if(err) res.end();
  	if(!ret.result.nModified) {
  		res.end();
  	} else {
  		updateStuffInfo( person, {isLocked: false} );
  		res.send('OK');
  	}
  });

});

app.post("/lockScreen", function (req, res) {
  var person = req.body.person;

  col.updateOne({ role:'stuff', 'stuffList.userid':person }, {$set: {'stuffList.$.isLocked': true} }, function(err,ret){
  	if(err) res.end();
  	if(!ret.result.nModified) {
  		res.end();
  	} else {
	    updateStuffInfo( person, {isLocked: true} );
  		res.send('OK');
  	}
  });

});



app.post("/getFinger", function (req, res) {
  var msgid = req.body.msgid;
  var reqData = getWsData(msgid);
  if(!reqData) return res.send('');
  var finger = reqData.finger;
  var condition = {finger:finger, role:'finger', status:{$ne:-1}, date:{$gt: new Date(moment().subtract(14, 'days')) } };

  res.cookie('finger', finger);

  col.findOne( condition , function(err, item){
    if(!item || !item.userid) {

      console.log('not found',msgid, finger);

      var qrStr = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx59d46493c123d365&redirect_uri=http%3A%2F%2F1111hui.com%2F/pdf/getFinger.php&response_type=code&scope=snsapi_base&state='+ msgid +'#wechat_redirect';
      var encoder = new QREncoder;
      dUri = new Datauri();
      encoder.on('end', function(png_data){
          var udata = dUri.format('.png', png_data);
          res.send( { userid:'', qrcode: udata.content } );
      });

      encoder.encode(qrStr, null, {dot_size:5, margin:4} );

    } else {
    	res.send( item );
    }

  } );
});


app.post("/exitApp", function (req, res) {
  if(!req.cookies.finger) return res.send('');
	console.log('logout', req.cookies.finger);
  col.updateMany( { finger:req.cookies.finger, role:'finger' }, { $set:{status:-1} } );
  req.cookies.finger = null;
	req.cookies.userid = null;
	res.clearCookie('finger');
	res.clearCookie('userid');
	res.send('ok');
});

app.post("/getLoginUserInfo", function (req, res) {

	var finger = req.cookies.finger;
  console.log('login', finger);
  if(!finger) return res.send('');

  col.findOne( { finger:finger, role:'finger', status:{$ne:-1} }, { sort:{date:-1} } , function(err, item){

    if(!item || !item.userid) {
	     return res.send('');
     }else{
        res.cookie('userid', item.userid);
    	 getUserInfo(item.userid, res);
       //col.updateOne({ msgid:msgid, role:'finger' }, { $set:{msgid:null} } );
     }

  });
});

app.post("/confirmFingerInfo", function (req, res) {
  	var data = req.body;
  	var msgid = data.msgid;

  	// the DATA: data format:
  	// {"UserId":"yangjiming","DeviceId":"d2d4b44c51f855c4e96a9ab0f169a2e5","finger":"727b08525269ddd8fee24a1eac276a76","msgid":"1441194684860.234"}


	col.insertOne(
		{ finger:data.finger, role:'finger', userid:data.UserId, deviceID: data.DeviceId, date:new Date(), msgid:msgid },
		{w:1},
		function(err, result) {

			sendWsMsg( msgid, JSON.stringify(data) );
			getUserInfo(data.UserId, res);

		}
	);


});



app.post("/putFingerInfo", function (req, res) {
  var code = req.body.code;
  var msgid = req.body.msgid;
  var reqData = getWsData(msgid);
  console.log(code, msgid, reqData);

  if(!code || !reqData) return res.send('');

  var finger = reqData.finger;
  console.log(finger, msgid, code);

  var tryCount = 0;
  function doit(){

    api.getLatestToken(function  (err, token) {
        if( !token && tryCount++<5 ) {
          doit();return;
        }

        urllib.request("https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token="+ token.accessToken +"&code="+code, function(err, data, meta) {
          if(!data && tryCount++<5 ){
            return doit();
          }
          console.log("wx client auth: ", finger, data.toString() );
          try{
            var ret = JSON.parse( data.toString() );
          }catch(e){ return res.send(''); }
          ret.finger = finger;
          //ret.state = state;
          ret.msgid = msgid;
          res.send( ret );

        });
    });

  }
  doit();

});

app.get("/getUserID", function (req, res) {

  var code = req.query.code;
  var state = req.query.state;
  if(!code){
    return res.send('');
  }

  var tryCount = 0;
  function doit(){

    api.getLatestToken(function  (err, token) {
        if( !token && tryCount++<5 ) {
          doit();return;
        }
        console.log(code, state, token);

        urllib.request("https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token="+ token.accessToken +"&code="+code, function(err, data, meta) {
          if(!data && tryCount++<5 ){
            return doit();
          }
          console.log("new wx client: ", data.toString() );
          try{
          var ret = JSON.parse( data.toString() );
          }catch(e){ return res.send(''); }
          //ret.state = state;
          res.send( JSON.stringify(ret) );
        });
    });

  }
  doit();

});

app.post("/getJSTicket", function (req, res) {
  var tryCount = 0;
  function getTicket(){
    api.getTicket(function(err, result){
      if(err && tryCount++<3){
        getTicket();
      }else{
        res.send( result );
      }
    });
  }
  getTicket();

});


function getShareName ( colShare, addSlash ) {
  var a= (colShare.isSign?'流程':'共享')+colShare.shareID+ (colShare.msg?'['+colShare.msg+']':'' ) + '('+colShare.fromPerson.concat(colShare.toPerson).map(function(v){return v.name}).join(',')+')' ;
  if(addSlash) a='/'+a+'/';
  return a;
}

function imageToPDF (person, fileName, res, oldData, folder ){
	var ext = path.extname(fileName);
	var baseName = path.basename(fileName, ext);
  var imgFile = fileName.replace(IMAGE_UPFOLDER, '');
  var cmd = ' rm -f '+IMAGE_UPFOLDER+'/*.pdf; cd '+IMAGE_UPFOLDER+'; /bin/cp -f ../make.tex '+ baseName +'.tex; pdflatex "\\def\\IMG{'+ imgFile +'} \\input{'+ baseName +'.tex}"';
    console.log(cmd);

  exec(cmd, function(err,stdout,stderr){
    // console.log(err, stdout);
    if(err)  return res&&res.send('');
    console.log('pdf file info: ' + baseName,  err, stderr);
    if (err||stderr) return res&&res.send( '' );

    exec('cd '+IMAGE_UPFOLDER+'; rm -f '+baseName+'.tex *.log *.aux; ');

    qiniu_uploadFile(IMAGE_UPFOLDER+ baseName+ '.pdf', function(ret){


      if(ret.error) return res&&res.send('');

      if(oldData){

        if(oldData.person) ret.person = oldData.person;
        if(oldData.client) ret.client = oldData.client;
        ret.title = oldData.title+'.pdf';
        ret.path = oldData.path;
        ret.srcFile = oldData.key;
        if(oldData.shareID){
        	ret.shareID = oldData.shareID;
	        ret.role = 'addToShare';
        } else {
        	ret.role = 'upfile';
        }
        if(oldData.order) ret.order = oldData.order;
	      console.log(ret);

	      upfileFunc(ret, function(ret2){
	        res&&res.send(ret2);
	        wsBroadcast(ret2);
	      });


      } else {

      	ret.role = 'upfile';
        ret.person = person;
        ret.client = '';
        ret.title = '图片上传-'+baseName+'.pdf';
        ret.path = folder || '/';
        ret.srcFile = fileName;

        console.log('upload wx image:', fileName);
	    qiniu_uploadFile(fileName, function(srcRet) {

	    	srcRet.role = 'upfile';
	        srcRet.person = person;
	        srcRet.client = '';
	        srcRet.title = fileName.split('/').pop();
	        srcRet.path = folder || '/';

		    upfileFunc(srcRet, function(srcRet2){
		      upfileFunc(ret, function(ret2){
		        res&&res.send(ret2);
		        wsBroadcast(ret2);
		      });
		    });
		 });

      }



    } );
  });
}

app.post("/generatePDFAtPrinter", function (req, res) {

  var CONVERT_TIMEOUT = 2*60*1000 ;
  var data = req.body;
  data.task = 'generatePDF';
  data.msgid = +new Date()+Math.random().toString().slice(2,5)+'_';
  wsSendPrinter(data, null, res);
  // will wait for job done WS Message from printer client app. check ws message: type=printerMsg

  setTimeout(function printTimeout () {
    if(res.finished) return;
    var job = JOBS[data.msgid];
    if(!job ) return res.send('');
    console.log('job timeout:' , job.printerName, job.data.key);
    return res.send('');
  }, CONVERT_TIMEOUT );

  return;

  var count =0;
  var inter1=setInterval(function  () {
    if( count++ > 120 ){
      clearInterval(inter1);
      res.send('');
    }
    if( JOBS[data.msgid].done ){
      clearInterval(inter1);
      res.send(data);
    }
  }, 1000);


});

app.post("/printPDF", function (req, res) {
	// req data: {server, printer, fileKey, shareID, person }
  var data = req.body;
  data.task = 'printPDF';
  data.msgid = +new Date()+Math.random().toString().slice(2,5)+'_';
  wsSendPrinter(data, data.server, res);

});


app.post("/uploadPCImage", function (req, res) {
  var data = req.body.data;
  var filename = req.body.filename;
  var person = req.body.person;
  var shareID = req.body.shareID;

  filename = encodeURIComponent(filename);

  console.log('filename', filename)

  var MAX_WIDTH = 2000;
  var MAX_HEIGHT = 2000;
  // we convert from QINIU cloud
  if(data) {

    if(data.shareID) data.shareID = safeEval( data.shareID );
    filename = data.key;
     var ext = filename.split(/\./).pop();

    var baseName = moment().format('YYYYMMDDHHmmss') ;
    var destPath = IMAGE_UPFOLDER+ baseName + '.'+ ext.toLowerCase();
    var UPFOLDER = IMAGE_UPFOLDER+ baseName+'/';

    var wget = 'mkdir '+ UPFOLDER +'; wget --restrict-file-names=nocontrol -P ' + UPFOLDER + ' -N "' + FILE_HOST+ filename +'"';
    var child = exec(wget, function(err, stdout, stderr) {
      console.log( err, stdout, stderr );
      if(err) return res.send('');

      filename = filename.split(/\//).pop();

      exec( util.format('identify "%s"', UPFOLDER+ filename ), function(err, stdout, stderr) {
      	console.log(err, stdout, stderr);
      	if(err) return res.send('');

      	var fileds = stdout.toString().split(/\s+/);
      	var dim = fileds[2].split('x').map( function(v){ return parseInt(v, 10) } );
      	console.log('dimension', filename, dim );

      	var scale = '';
      	var r = dim[0]/dim[1];
      	if( r>=1 && dim[0]>MAX_WIDTH ) scale = ' -resize '+ MAX_WIDTH;
      	if( r<1 && dim[1]>MAX_HEIGHT ) scale = ' -resize '+ MAX_HEIGHT/dim[1]*100 + '%';

      	var cmd =  util.format( 'convert "%s" -quality 85 -density 72 %s "%s"', UPFOLDER+ filename, scale, destPath);
      	console.log(cmd);

	     exec(cmd, function(err, stdout, stderr) {
	      	console.log(err,stdout,stderr);
	      	if(err) return res.send('');

	        imageToPDF(person, destPath, res, data);

	      });

      });



    });

  } else{
    // we convert from our server uploaded already from client


      var ext = filename.split(/\./).pop();

     var baseName = moment().format('YYYYMMDDHHmmss') ;
     var destPath = IMAGE_UPFOLDER+ baseName + '.'+ ext;

     exec( util.format( 'convert "%s" -density 72 "%s"', IMAGE_UPFOLDER+ filename, destPath), function(err, stdout, stderr) {
     	if(err) return res.send('');

       imageToPDF(person, destPath, res);

     });

  }


});



function uploadWXImage(req, res) {
  var mediaID = req.query.mediaID;
  var person = req.query.person;
  var shareID = safeEval( req.query.shareID );
  var isInMsg = safeEval(req.query.isInMsg);
  var path = req.query.path;
  var text = req.query.text;

  api.getMedia(mediaID, function(err, buffer, httpRes){
    if(err) {console.log(err); return res.send('');}

    var filename = httpRes.headers['content-disposition'].match(/filename="(.*)"/i).pop();
    var ext = filename.split(/\./).pop();

    var baseName = moment().format('YYYYMMDDHHmmss') ;
    var fileName = IMAGE_UPFOLDER+ baseName + '.'+ ext;

    fs.writeFile(fileName, buffer, function(err){
      console.log(err, 'image file written', fileName);
      if (err) return res.send( '' );



      qiniu_uploadFile(fileName, function(srcRet) {

          srcRet.role = 'upfile';
          srcRet.person = person;
          srcRet.isInMsg = isInMsg;
          srcRet.client = '';
          srcRet.title = fileName.split('/').pop();
          srcRet.path = path || (isInMsg?'/消息附件/':'/');
          if(text) srcRet.imageDesc = text;
          if(shareID){
            srcRet.shareID = shareID;
            srcRet.role = 'share';
          }

        upfileFunc(srcRet, function(ret){
            res.send(ret);
            wsBroadcast(ret);

            if(isInMsg){

              col.findOneAndUpdate(
                {role:'share', shareID:shareID, 'files.key': ret.key }, { $inc:{'files.$.pdfCount':1} }, { fields: { files: { $elemMatch:{ files: { key: ret.key } } }, files:1, toPerson:1, fromPerson:1, msg:1, shareID:1  }   },  function(err, data) {
                  data = data.value;

                	var pdfCount = 1;
                  imageToPDF(person, fileName, null, srcRet, path, pdfCount);

                  var shareName = getShareName(data, true);
                  //get segmented path, Target Path segment and A link
                 var overAllPath = util.format('<a href="%s#path=%s&shareID=%d&picurl=%s">%s</a>', SHARE_MSG_URL, shareName, shareID, encodeURIComponent(FILE_HOST+ret.key), shareName ) ;



                  var msg = {
                   "touser": data.toPerson.concat(data.fromPerson).map(function(v){return v.userid}).join('|'),
                   "touserName": data.toPerson.concat(data.fromPerson).map(function(v){return v.name}).join('|'),
                   "msgtype": "news",
                   "news": {
                     "articles":[
                     {
                      "title": util.format('%s 在%s 上传了图片%s',
                        data.fromPerson.shift().name,
                        shareName,  // if we need segmented path:   pathName.join('-'),
                        ''
                      ),
                      "description": text || "查看消息记录",
                      "url": util.format('%s#path=%s&shareID=%d&picurl=%s' , SHARE_MSG_URL, shareName, shareID, encodeURIComponent(FILE_HOST+ret.key) ),
                     "picurl": FILE_HOST+ret.key
                   }
                   ] },
                   "safe":"0",
                    date : new Date(),
                    role : 'shareMsg',
                    titleTrail: '，<a href="'+ makeViewURL(ret.key.replace(/\.\w+$/, '.pdf'), ret.shareID) +'">点此标注</a>',
                    shareID:shareID
                  };

                  msg.appRole = 'chat';

                  sendWXMessage(msg, person);

              });
            }
        });
      });

    });


    return;
    fs.open(path, 'w', function(err, fd) {
        if (err) {
            throw 'error opening file: ' + err;
        }

        fs.write(fd, buffer, 0, buffer.length, null, function(err) {
            if (err) throw 'error writing file: ' + err;
            fs.close(fd, function() {
                console.log('file written');
                res.send('file:'+path);
            })
        });
    });

  });
}

app.get("/uploadWXImage", uploadWXImage);

app.post("/getJSConfig", function (req, res) {

  var url = req.body.url;
  var rkey = 'wx:js:ticket:'+ encodeURIComponent(url);
  var param = {
    debug:false,
    jsApiList: ["onMenuShareTimeline","onMenuShareAppMessage","onMenuShareQQ","onMenuShareWeibo","onMenuShareQZone","startRecord","stopRecord","onVoiceRecordEnd","playVoice","pauseVoice","stopVoice","onVoicePlayEnd","uploadVoice","downloadVoice","chooseImage","previewImage","uploadImage","downloadImage","translateVoice","getNetworkType","hideOptionMenu","showOptionMenu","hideMenuItems","showMenuItems","hideAllNonBaseMenuItem","showAllNonBaseMenuItem","closeWindow","scanQRCode",'openEnterpriseChat'],

    // jsApiList: ["onMenuShareTimeline","onMenuShareAppMessage","onMenuShareQQ","onMenuShareWeibo","onMenuShareQZone","startRecord","stopRecord","onVoiceRecordEnd","playVoice","pauseVoice","stopVoice","onVoicePlayEnd","uploadVoice","downloadVoice","chooseImage","previewImage","uploadImage","downloadImage","translateVoice","getNetworkType","openLocation","getLocation","hideOptionMenu","showOptionMenu","hideMenuItems","showMenuItems","hideAllNonBaseMenuItem","showAllNonBaseMenuItem","closeWindow","scanQRCode"],

    url: url
  };

  var tryCount = 0;
  function getJsConfig(){
  	api.getLatestToken(function () {
  		api.getJsConfig(param, function(err, result){
        if(err) console.log('getJSConfig: ', err, result);
  		  if(err && tryCount++<3){
  		    getJsConfig();
  		  }else{
  		    redisClient.set( rkey, JSON.stringify(result), 'ex', 30);
  		    res.send( JSON.stringify(result) );
  		  }
  		});
  	});

  }

  //redisClient.set('aaa', 100, 'ex', 10);
  redisClient.get( rkey , function(err, result){
    if(!result){
      getJsConfig();
    } else {
      // console.log('redis:', result );
      res.send( result );
    }
  } );

});


function upfileFunc (data, callback) {
  var person = data.person;
  var savePath = data.path || data.savePath || '/';   //first upload to root path
  var fname = data.fname;
  var maxOrder = 0;


  if( data.shareID ) {

      data.shareID = safeEval( data.shareID );
      data.isInMsg = safeEval( data.isInMsg );

      var newData = _.extend( data, { person: person, date: new Date(), path:savePath } );

      if(data.isInMsg){
      	newData.path = '/消息附件/';
      }

      col.update({ role:'share', shareID:data.shareID }, { $addToSet:{ files: newData } } , {upsert:true, w: 1}, function(err, result) {
          if(err) callback('');
          console.log('up shared file: ', { role:'share', shareID:data.shareID, 'files.key': data.key }, data.shareID, data.key, err);
          newData.role = 'share';
          callback( newData );
       });

  } else {

    col.find( { person: person, role:'upfile', status:{$ne:-1} } , {limit:2000} ).sort({order:-1}).limit(1).nextObject(function(err, item) {
      if(err) {
        return res.send('error');
      }
      maxOrder = item? item.order+1 : 1;
      console.log( 'maxOrder:', maxOrder );

      var newData = _.extend( data, { person: person, role:'upfile', date: new Date(), path:savePath, order:maxOrder } );

      col.update({ hash:data.hash }, newData , {upsert:true, w: 1}, function(err, result) {
          console.log('upfile: ', newData.hash, newData.key, result.result.nModified);
          callback( newData );
       });

    });

  }


}



app.post("/upfile", function (req, res) {
  var data = req.body;
  console.log(data)

  function upFun (ret) {
    res.send( JSON.stringify(ret) );

    // Send WX Message when it's upload images & sound files to share Folder


    //if(! ret.isInMsg) return;
    if(! ret.shareID){
      wsSendClient(ret.person, ret);
      return;
    }

    var shareID = ret.shareID;

    col.findOneAndUpdate(
      {role:'share', shareID:shareID, 'files.key': ret.key }, {$inc:{'files.$.pdfCount':1}}, { fields: {'files': { $elemMatch:{ files: { key: ret.key } } }, toPerson:1, fromPerson:1, msg:1  }   },  function(err, data){
        data = data.value;

        if( regex_image.test(ret.key) ) {

          //get segmented path, Target Path segment and A link
         var overAllPath = util.format('<a href="%s#path=%s&shareID=%d&picurl=%s">%s</a>', SHARE_MSG_URL, getShareName(data, true), shareID, encodeURIComponent(FILE_HOST+ret.key) , ret.shareName ) ;

          var msg = {
           "touser": data.toPerson.concat(data.fromPerson).map(function(v){return v.userid}).join('|'),
           "touserName": data.toPerson.concat(data.fromPerson).map(function(v){return v.name}).join('|'),
           "msgtype": "news",
           "news": {
             "articles":[
             {
              "title": util.format('%s 在%s 上传了图片%s',
                data.fromPerson[0].name,
                ret.shareName,  // if we need segmented path:   pathName.join('-'),
                ''
              ),
              "description": ret.text || "查看消息记录",
              "url": util.format('%s#path=%s&shareID=%d&picurl=%s', SHARE_MSG_URL, getShareName(data, true), shareID, encodeURIComponent(FILE_HOST+ret.key) ),
             "picurl": FILE_HOST+ret.key
           }
           ] },
           "safe":"0",
            date : new Date(),
            role : 'shareMsg',
            titleTrail: '，<a href="'+ makeViewURL(ret.key.replace(/\.\w+$/, '.pdf'), ret.shareID) +'">点此标注</a>',
            shareID:shareID
          };

          msg.appRole = 'chat';

          sendWXMessage(msg, data.fromPerson[0].userid);


          // convert image to pdf directly for PC; for wx see uploadWXImage() function
          var filename = ret.key;
           var ext = filename.split(/\./).pop();

          var baseName = moment().format('YYYYMMDDHHmmss') ;
          var destPath = IMAGE_UPFOLDER+ baseName + '.'+ ext.toLowerCase();
          var UPFOLDER = IMAGE_UPFOLDER+ baseName+'/';

          var wget = 'mkdir '+ UPFOLDER +'; wget --restrict-file-names=nocontrol -P ' + UPFOLDER + ' -N "' + FILE_HOST+ filename +'"';
          var child = exec(wget, function(err, stdout, stderr) {
            console.log( err, stdout, stderr );
            if(err) return;
            var pdfCount = 1;
            imageToPDF(ret.person, UPFOLDER+path.basename(filename) , null, ret, pdfCount);
          });

      } else {

         var overAllPath = util.format('<a href="%s#path=%s&shareID=%d&openMessage=0">%s</a>', TREE_URL, ret.key, shareID, getShareName(data, true) ) ;

          var msg = {
           "touser": data.toPerson.concat(data.fromPerson).map(function(v){return v.userid}).join('|'),
           "touserName": data.toPerson.concat(data.fromPerson).map(function(v){return v.name}).join('|'),
           "msgtype": "text",
           "text": {
             "content":
             util.format('%s 在%s 上传了文件：%s',
              data.fromPerson[0].name,
              getShareName(data, true),
               util.format('<a href="%s#path=%s&shareID=%d&openMessage=0">%s</a>', TREE_URL, ret.key, shareID, ret.title )
             )
           },
            "safe":"0",
            date : new Date(),
            role : 'shareMsg',
            shareID:shareID
          };

          sendWXMessage(msg, data.fromPerson[0].userid);

      }

      wsBroadcast( ret );


    });
  }

  _.each(data, function(v,i){
    data[i] = safeEval(v);
  });

  if(data.person){
    upfileFunc(data, upFun);
  } else if(data.client) {

    var client = data.client.replace(/\\/g,'').toLowerCase();

    col.findOne({role:'stuff', $or:[ {'stuffList.client': client}, {'stuffList.ip': client} ] },
                {fields: {'stuffList': {$elemMatch: { $or:[ {client: client}, {ip:client} ] } }  } }, function(err, ret){
      if(err|| !ret) {
        console.log('No client found:', client);
        return res.sendStatus(404);
      }
      var stuff = ret.stuffList.shift();
      data.person = stuff.userid;
      upfileFunc(data, upFun);
    }  );
  }


} );


app.post("/updateHost", function (req, res) {
  var person = req.body.person;
  var hostname = req.body.hostname.toLowerCase();
  var ip = req.body.ip;
  var finger = req.body.finger;
  col.update({role:'stuff', 'stuffList.userid': person }, { $set:{ role:'stuff', 'stuffList.$.userid': person, 'stuffList.$.client': hostname,  'stuffList.$.ip': ip,  'stuffList.$.finger': finger } }, {upsert:1}, function(err, ret){
    if(err) {
      console.log('ERROR update host:', person, hostname);
      return res.send('');
    }


    updateStuffInfo( person, { client:hostname, ip:ip } );

    console.log('updated host:', person, hostname, ip);
    res.send('OK');
  });

});

app.post("/rotateFile", function (req, res) {
	var data = req.body;
	var oldFile, newFile;
	var file_url = data.url;
	var jsonp = data.callback;
	var dir = data.dir;
	if( "LRD".indexOf(dir)==-1 || !file_url.match(/\.pdf$/) ) {
		return res.send("非法参数");
	}

    // extract the file name
    var file_name = file_url.replace(FILE_HOST, '');
    //var newName = file_name.replace(/(\(.*\))?\.pdf$/, '('+ 90 +').pdf' );
    var oldRotate = file_name.match(/(\(.*\))?\.pdf$/)[1];
    oldRotate = oldRotate ? parseInt(oldRotate.replace('(','')) : 0;

    var newRotate = dir=="L"?oldRotate-90 : (dir=="R"?oldRotate+90: oldRotate+180 );
    newRotate = (newRotate+3600)%360;

    var dirName= dir=="L"?"左旋" : (dir=="R"?"右旋":"颠倒");
    var newName = file_name.replace(/(\(.*\))?\.pdf$/, newRotate==0 ? '.pdf' : '('+ newRotate +').pdf' );

    col.findOne({role:'upfile', key: file_name }, function(err, item){
    	if(item){
    		oldFile = item;
    		col.findOne({role:'upfile', key: newName }, function(err2, item2){
    			if(item2){
	    			newFile = item2;
	    			console.log('exist rotate,', newName);
	    			return res.send( JSON.stringify(newFile) );
	    		} else {
					var child = exec('rm -f '+DOWNLOAD_DIR+'; mkdir -p ' + DOWNLOAD_DIR, function(err, stdout, stderr) {
					    if (err) throw err;
					    else download_file_wget(file_url);
					});
	    		}
    		});
    	} else {
    		return res.send("非法参数");
    	}
    });

	// Function to download file using wget
	var download_file_wget = function(file_url) {


	    function upToQiniu(){

		    // compose the wget command
		    var wget = 'wget --restrict-file-names=nocontrol -P ' + DOWNLOAD_DIR + ' -N "' + file_url+'"';
		    // excute wget using child_process' exec function

		    var child = exec(wget, function(err, stdout, stderr) {
		        if (err){ throw err; return; }
		        else console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR);

		        var pdftk = exec('pdftk "'+ DOWNLOAD_DIR+file_name +'" cat 1-end'+dir+' output "'+DOWNLOAD_DIR+newName+'"' , function(err, stdout, stderr) {
		        	if (err){ throw err; return; }
		        	else console.log('rotate ok '+newName);
		        	//res.send('ok');
		        	qiniu_uploadFile(DOWNLOAD_DIR+newName, function(ret){

		        		if(!ret.error){
			        		ret.person = oldFile.person;
			        		ret.client = oldFile.client;
			        		ret.title = oldFile.title+'('+dirName+')';
			        		ret.path = oldFile.path;
			        	} else if ( ret.error.match(/file exists/) ) {
			        		// file exists or other error
    							delete oldFile._id;
    							oldFile.date = new Date();
    							oldFile.key = newName;
    							oldFile.fname = newName;
    							oldFile.title += '('+dirName+')';
				        	oldFile.hash = ret.hash? ret.hash : +new Date()+Math.random().toString().slice(2,5)+'_';
				        	ret = oldFile;
				        	console.log('ret:', ret)
			        	}

                delete ret.drawData;
                delete ret.inputData;
                delete ret.signIDS;

	        			upfileFunc(ret, function(ret2){
	        				res.send( JSON.stringify(ret2)  );
	        				wsSendClient(ret.person, ret);
	        			});

		        		return;

		        	} );
		        });
		    });
		}
		upToQiniu();
	};


});



app.post("/getUserInfo", function (req, res) {

  var data = req.body;
  var userid = data.userid;
  getUserInfo(userid, res);
});

function getUserInfo2 (userid, res) {
  col.findOne( { company:CompanyName, role:"companyTree", 'stuffList.userid': userid, 'stuffList.status': 1 } , {limit:1, fields:{'stuffList.$':1} }, function(err, item) {
    if(err ||  !item.stuffList || !item.stuffList.length) {
      return res.send('');
    }
      res.send( item.stuffList[0] );
    });
}

function getUserInfo (userid, res) {
  var user = _.find(COMPANY_TREE, {userid:userid, status:1});

	if(res) res.send( user );

  return user;
}



app.post("/exitMember", function (req, res) {
    var data = req.body;
    var shareID = safeEval(data.shareID) ;
    var shareName = data.shareName ;
    var person = data.person ;
    var personName = data.personName ;


    col.findOneAndUpdate({role:'share', shareID:shareID }, { $pull: { 'toPerson': { userid: person }  }  }, {returnOriginal:false},
        function(err, result) {

          if(err) return res.send('');
          else res.send(result.value.toPerson);

          var colShare = result.value;


            var overAllPath = util.format('%s#path=%s&shareID=%d', TREE_URL, encodeURIComponent(shareName), shareID ) ;
            var wxmsg = {
             "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
             "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
             "msgtype": "text",
             "text": {
               "content":
               util.format('%s 退订成员：%s <a href="%s">查看共享</a>',
                  shareName,
                  personName,
                  overAllPath  // if we need segmented path:   pathName.join('-'),
                )
             },
             "safe":"0",
              date : new Date(),
              role : 'shareMsg',
              shareID:shareID
            };

            sendWXMessage(wxmsg, person);



    });


});

app.post("/addMember", function (req, res) {

    var data = req.body;
    var shareID = safeEval(data.shareID) ;
    var shareName = data.shareName ;
    var stuffs = data.stuffs ;
    var personName = data.personName ;

    col.findOneAndUpdate({role:'share', shareID:shareID }, { $addToSet: { 'toPerson': { $each: stuffs }  }  }, {returnOriginal:false},
        function(err, result) {

          if(err) return res.send('');
          else res.send(result.value.toPerson);

          var colShare = result.value;

          var existMember = _.intersection(colShare.toPerson, stuffs);
          var newMember = _.difference(stuffs, existMember);

          if(newMember.length) {

            var overAllPath = util.format('%s#path=%s&shareID=%d', TREE_URL, encodeURIComponent(shareName), shareID ) ;
            var wxmsg = {
             "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
             "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
             "msgtype": "text",
             "text": {
               "content":
               util.format('%s加入了新成员：%s，操作者：%s <a href="%s">查看共享</a>',
                  shareName,
                  newMember.map(function(v){return v.name}).join(',') ,
                  personName,
                  overAllPath  // if we need segmented path:   pathName.join('-'),
                )
             },
             "safe":"0",
              date : new Date(),
              role : 'shareMsg',
              shareID:shareID
            };

            sendWXMessage(wxmsg);

          }


    });
});


app.post("/markFinish", function (req, res) {

    var data = req.body;
    var person = data.person;
    var personName = data.personName;
    var shareID = safeEval(data.shareID) ;
    var path = safeEval(data.path) ;
    var isFinish = safeEval(data.isFinish) ;

    col.findOneAndUpdate({role:'share', shareID:shareID }, { $set: { 'isFinish':!!isFinish }  },
        function(err, result){

          var colShare = result.value;

          res.send(result);
          wsBroadcast( {role:'share', isFinish:isFinish, data:colShare } );

          var overAllPath = util.format('%s#path=%s&shareID=%d', TREE_URL, encodeURIComponent(path), shareID ) ;

          var wxmsg = {
           "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
           "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
           "msgtype": "text",
           "text": {
             "content":
             util.format('/%s/已由%s标记为：%s<a href="%s">查看共享</a>',
                path.replace(/^\/|\/$/g,''),
                personName,
                isFinish?'已完成' : '未完成',
                overAllPath  // if we need segmented path:   pathName.join('-'),
              )
           },
           "safe":"0",
            date : new Date(),
            role : 'shareMsg',
            shareID:shareID
          };

          sendWXMessage(wxmsg, person);

    });

});

function makeViewURL (fileKey, shareID, isSign) {
  var url = VIEWER_URL+'#file='+FILE_HOST+ encodeURIComponent(fileKey);
  if(shareID) url+='&shareID='+shareID;
  if(isSign) url+='&isSign='+isSign;
  return url;
}

app.post("/signInWeiXin", function (req, res) {
	var data = safeEvalObj(req.body);
	var url = data.url;
	var shareID = safeEval(data.shareID);
	var fileKey = data.fileKey;
  var person = data.person;
  var isFlow = data.isFlow;
  var signPerson = data.signPerson;
	var fileName = data.fileName;


  if( !shareID ){


    col.findOne({role:'upfile', 'key':fileKey },  function(err, result) {

          if(err || !result) return res.send('');


          // send to one person wx on file
          var file = result;
          var content =
            util.format('文件 <a href="%s">%s</a> 需要您签署，<a href="%s">点此签署</a>',
                    makeViewURL(fileKey, null, null),
                    file.title,
                    url
                  );

          var wxmsg = {
             "touser": signPerson,
             "touserName": getUserInfo(signPerson).name,
             "msgtype": "text",
             "text": {
               "content":content
             },
             "safe":"0",
              date : new Date(),
              role : 'shareMsg',
              shareID:shareID,
              WXOnly: true
            };

            sendWXMessage(wxmsg);
            console.log(signPerson);

            res.send(signPerson);


    });


  } else {




    col.findOne({role:'share', shareID:shareID, 'files':{ $elemMatch:{key:fileKey} } },
                        { fields:{ flowName:1, msg:1, fromPerson:1, toPerson:1, isSign:1, curFlowPos:1, flowSteps:1, 'files.$':1 } },

                        function(err, result){


          if(err || !result) return res.send('');

          if( !isFlow ) {

            // send to one person wx
            var file = result.files[0];
            var content =
              util.format('文件 <a href="%s">%s</a> 需要您签署，<a href="%s">点此签署</a>',
                      makeViewURL(fileKey, shareID, result.isSign),
                      file.title,
                      url
                    );

            var wxmsg = {
               "touser": signPerson,
               "touserName": getUserInfo(signPerson).name,
               "msgtype": "text",
               "text": {
                 "content":content
               },
               "safe":"0",
                date : new Date(),
                role : 'shareMsg',
                shareID:shareID,
                WXOnly: true
              };

              sendWXMessage(wxmsg);
              console.log(signPerson);

              res.send(signPerson);

          } else {


            // send to flow person wx

            var colShare = result;
            var flowName = colShare.flowName;
            var msg = colShare.msg;
            var isSign = colShare.isSign;

            var curFlowPos = colShare.curFlowPos;
            var mainPerson = colShare.flowSteps[curFlowPos].mainPerson;

            if(!mainPerson) return res.send('');

            var realMainPerson =  placerholderToUser(colShare.fromPerson[0].userid, mainPerson);

            if( person != realMainPerson.userid ){
              var content =
                util.format('流程%d %s (%s-%s)需要您签署，<a href="%s">查看文件</a>',
                        shareID,
                        msg,
                        colShare.flowName,
                        colShare.fromPerson[0].name,
                        makeViewURL(fileKey, shareID, result.isSign)
                      )
              var touser = realMainPerson.userid;
              var touserName = realMainPerson.depart+'-'+realMainPerson.name;

            } else {
              var touser = person;
              var touserName = person;
              var content =
              colShare.isSign ?
              util.format('流程%d %s (%s-%s)需要您签署，<a href="%s">点此签署</a>',
                      shareID,
                      msg,
                      colShare.flowName,
                      colShare.fromPerson[0].name,
                      url  // if we need segmented path:   pathName.join('-'),
                    ) :
              util.format('共享%d %s (%s)需要您签署，<a href="%s">点此签署</a>',
                      shareID,
                      msg,
                      colShare.fromPerson[0].name,
                      url  // if we need segmented path:   pathName.join('-'),
                    )

            }


             var wxmsg = {
               "touser": touser,
               "touserName": touser,
               "msgtype": "text",
               "text": {
                 "content":content
               },
               "safe":"0",
                date : new Date(),
                role : 'shareMsg',
                shareID:shareID,
                WXOnly: true
              };

              sendWXMessage(wxmsg);

              res.send(touserName);




          }

    } );





  }





});



app.post("/applyTemplate", function (req, res) {

  var data = req.body;
  var path = data.path;
    var userid = data.userid;
  var info = data.info;

    try{
      info = JSON.parse(info);
  } catch(e){ console.log('error parse drawData',path,userid); return res.send('') }

    var key = info.key;
    var newKey = moment().format('YYYYMMDDHHmmss') + '-'+ key.split('-').pop();


    var client = new qiniu.rs.Client();
  client.copy(QiniuBucket, key, QiniuBucket, newKey, function(err, ret) {
    if (err) return res.send('');


    col.findOne( { person: userid, status:{$ne:-1} } , {limit:1, sort:{order:-1}  }, function(err, item) {

      var maxOrder = item? item.order+1 : 1;

    var fileInfo={
      role:'upfile',
      person:userid,
      client:'',
      title: info.title+'_'+moment().format('YYYYMMDD'),
      path: path,
      date: new Date(),
      key: newKey,
      fname:newKey,
      fsize:info.fsize,
      type:info.type,
      drawData:info.drawData,
      signIDS:info.signIDS,
      hash: +new Date()+Math.random().toString().slice(2,5)+'_'+'',
      order:maxOrder
    };

    col.insertOne(fileInfo, {w:1}, function(err,result){
      var id = result.insertedId;
      fileInfo._id = id;
      res.send(fileInfo);
    });

    });


  });

});


function pickUser(user){ return _.pick( user, 'userid', 'name', 'depart', 'id', 'pId', 'parentid', 'placeholder' ) }

function placerholderToUser (fromUserId, placeholder, getFullInfo) {

  var thePerson = null;
  var fromPerson = _.find( COMPANY_TREE, function(v){ return v.userid== fromUserId } );

  if( placeholder=='_self'){

    thePerson = fromPerson;

  } else if(placeholder=='_parent') {

    var sameLevel = COMPANY_TREE.filter(function(v){ return v.pId == fromPerson.pId && !!v.userid });
    thePerson = _.max( sameLevel, function(v){ return v.level } );

  } else if(placeholder=='_grand') {

      var start = fromPerson;
      var depart = _.find( COMPANY_TREE, function(v){ return v.id==start.pId } );

      var pDepart = _.find( COMPANY_TREE, function(v){ return v.id==depart.pId } );
      var sameLevel = COMPANY_TREE.filter(function(v){ return v.pId == pDepart.id && !!v.userid });

      while(sameLevel.length==0 && depart.pId>0) {
        var pDepart = _.find( COMPANY_TREE, function(v){ return v.id==depart.pId } );
        var sameLevel = COMPANY_TREE.filter(function(v){ return v.pId == pDepart.id && !!v.userid });
        if(sameLevel.length==0) depart = pDepart;
      }

      thePerson = !sameLevel? null: _.max( sameLevel, function(v){ return v.level } );

  } else if( placeholder=='_boss' ) {

    thePerson = _.max( COMPANY_TREE, function(v){ return v.level } );

  } else {

    thePerson = _.find( COMPANY_TREE, function(v){ return v.userid== placeholder } );

  }

  if(!thePerson) return thePerson;

  thePerson.placeholder = placeholder;

  return getFullInfo? thePerson : pickUser(thePerson);

}



app.post("/applyTemplate2", function (req, res) {

	var data = req.body;
	var path = data.path;
  	var userid = data.userid;
  var info = data.info;
  var signIDS = data.signIDS;

  	try{
	  	info = JSON.parse(info);
	} catch(e){ console.log('error parse drawData',path,userid); return res.send('') }

  	var key = info.key;
  	var newKey = moment().format('YYYYMMDDHHmmss') + '-'+ key.split('-').pop();


  	var client = new qiniu.rs.Client();
	client.copy(QiniuBucket, key, QiniuBucket, newKey, function(err, ret) {

	  if (err) return res.send('');


    col.findOne( { "role":"upfile", key:info.key } , {limit:1, sort:{date:-1}  }, function(err, doc) {

  		var fileInfo={
  			role:'share',
  			person:userid,
  			client:'',
  			title: doc.title+'_'+moment().format('YYYYMMDD'),
  			path: '/',
  			date: new Date(),
  			key: newKey,
  			fname:newKey,
  			fsize:doc.fsize,
  			type:doc.type,
  			drawData:doc.drawData,
  			signIDS: signIDS || doc.signIDS,
  			inputData:doc.inputData|| {} ,
  			hash: +new Date()+Math.random().toString().slice(2,5)+'_'+'',
  			order:0
  		};

  		var data = {};
      data.role = 'share';
      data.flowName = doc.title;
      data.msg = '';
      data.isSign = true;
      data.date = new Date();
      data.files = [fileInfo];
      data.fileIDS = [fileInfo.key];
      data.filePathS = {};
      data.filePathS[fileInfo.key.replace(/\./g, '\uff0e' )] = '/';

      var fromPerson = COMPANY_TREE.filter(function(v){ return v.userid== userid  }).shift();

      data.curFlowPos = 0;

      if(signIDS){

          var selectRange = signIDS.map(function(v){
            var obj = _.pick(v, '_id', 'person', 'mainPerson', 'order' );
            obj.person = obj.person.split('|').filter(function(v){ return v!='' });
            obj.order = safeEval(obj.order);
            return obj;
          }).sort(function(a,b){
            return a.order-b.order;
          });

          data.flowSteps = selectRange;

      } else {

          data.flowSteps = doc.flowSteps;

      }


      var toPerson = data.flowSteps[0].person.map(function(s){
        return placerholderToUser(userid, s);
      } );

      data.fromPerson = [ pickUser(fromPerson) ];
      data.toPerson  = [toPerson];

      data.selectRange =  data.flowSteps.filter(function(v){return v.mainPerson}).map(function  (v) {
        var P = placerholderToUser(userid, v.mainPerson);
        P.signID = v._id;
        return P;
      });

      insertShareData( data, res, true );

    });


	});

});




app.post("/getTemplateFiles", function (req, res) {
  // find signIDS.length > 0
  // http://stackoverflow.com/questions/7811163/how-to-query-for-documents-where-array-size-is-greater-than-one-1-in-mongodb/15224544#15224544
  col.find( { role:'upfile', isTemplate:true, status:{$ne:-1}, 'signIDS.0':{$exists:true} } , {limit:2000,fields:{drawData:0,inputData:0,signIDS:0} } ).sort({title:1,date:-1}).toArray(function(err, docs){
    if(err) {
      return res.send('error');
    }
      var count = docs.length;
      res.send( docs );
  });

});


app.post("/setFileTemplate", function (req, res) {
  var data = req.body;
  var hashA = data.hashA;
  var isSet = safeEval(data.isSet);
  col.update({role:'upfile', hash:{$in:hashA} }, { $set:{ isTemplate:isSet } }, {multi:1, w:1}, function(err, result){
  	return res.send(err);
  } );
});

app.post("/getfile", function (req, res) {
  var data = req.body;
  var person = data.person;
  var startOrder = safeEval(data.startOrder);


  var timeout = false;
  var connInter = setTimeout(function(){
    timeout = true;
    return res.send('');
  }, 5000);

  var condition = { person: person, role:'upfile', status:{$ne:-1} };
  if(startOrder)  condition.order = {$lt: startOrder };

  col.find(  condition , {limit:50, fields:{drawData:0,inputData:0,signIDS:0}, timeout:true} ).sort({order:-1, title:1}).toArray(function(err, docs){
      clearTimeout(connInter); if(timeout)return;
    if(err) {
      return res.send('');
    }
      var count = docs.length;
      res.send( JSON.stringify(docs) );
  });
});


function breakIntoPath(path){
  var part = path.split('/');
  var ret = [], dd = [];
  for(var i=0; i<part.length-1;i++){
    dd.push(part[i]);
    ret.push( dd.join('/') + '/' );
  }
  return ret.slice(1);
}

app.get("/downloadFile2/:name", function (req, res) {

	var file = FILE_HOST+req.query.key;
	var realname = req.params.name;
	var shareID = req.query.shareID||'';
	var userid = req.query.userid||'';
	var person = req.query.person||'';
	var rename = req.query.rename||realname;
	if(!realname) return res.end();

	var filename = path.basename(file);
  	var mimetype = mime.lookup(file);

  	console.log(filename, rename, req.query.key);

  	genPDF(req.query.key, shareID, realname, function  (err) {

  		if(err) {
  			res.send('');
  			wsSendClient(person, {role:'errMsg', message:err } );
  			return;
  		}

  		console.log('gen pdf ok, now download', IMAGE_UPFOLDER+realname, IMAGE_UPFOLDER+rename);

      if(realname == rename){

        res.download(IMAGE_UPFOLDER+rename);

      } else {

        exec('rm -f "'+ IMAGE_UPFOLDER+rename +'"; pdftk "'+IMAGE_UPFOLDER+realname+'" update_info client/pdfinfo.txt output "'+IMAGE_UPFOLDER+rename+'"', function(){
          res.download(IMAGE_UPFOLDER+rename);
        });

      }

  		return;

  		res.setHeader('Content-disposition', 'attachment; filename=' + rename);
		//res.setHeader('Content-type', mimetype);

		var filestream = fs.createReadStream( IMAGE_UPFOLDER+realname );
		filestream.pipe(res);
  	});
});


app.get("/downloadFile/:name", function (req, res) {

	var key = req.query.key;
	var file = FILE_HOST+key;
	var rename = req.query.rename;
	console.log(rename);

	exec( 'wget --restrict-file-names=nocontrol -P '+ DOWNLOAD_DIR + ' -N '+ file, function(){
		exec('rm -f "'+DOWNLOAD_DIR+rename+'"; mv '+DOWNLOAD_DIR+key+' "'+DOWNLOAD_DIR+rename+'"', function(){
			res.download( DOWNLOAD_DIR+rename );
		});
	} );

	return;

	// below is not work for rename download file!!!!!
	var filename = path.basename(file);
  	var mimetype = mime.lookup(file);

	res.setHeader('Content-disposition', 'attachment; filename=' + filename);
	res.setHeader('Content-type', 'application/pdf');

	var filestream = fs.createReadStream(file);
	filestream.pipe(res);
});

app.post("/updatefile", function (req, res) {
  var data = req.body.data;
  var type = req.body.type;
  var hashArr = data.map(function  (v) {
    return v.hash;
  });

  var isErr = false;
  data.forEach(function  (v,i) {
    var newV = _.extend(v, {date:new Date() } );
    newV.order = parseFloat(newV.order);
    newV.role = 'upfile';
    console.log('updatefile:', v.hash,  newV.order);
    delete newV._id;
    col.update({hash: v.hash}, {$set:newV}, {upsert:true, w:1}, function  (err, result) {
      if(err) {
      	console.log(err);
        return isErr=true;
      }
      var pathPart = breakIntoPath(v.path);
      if(err==null && pathPart.length && hashArr.length ) {
        col.remove({path:{ $in: pathPart }, key:{$in:[null,'']}, hash:{$not:{$in:hashArr}} });
      }
    } );
  });

  // can also check res.finished is true
  res.send(isErr ? "error update file" : "update file ok");
});

app.post("/removeFile", function (req, res) {
  var hash = req.body.hash;
  var key = req.body.key;
  var shareID = safeEval(req.body.shareID);

  if(shareID && key ){
	  col.update({role:'share', 'files.key': key, shareID:shareID }, { $pull:{ 'files': {key:key } } }, {multi:false});
  }else{
	  col.update({ role:'upfile', hash: hash}, {$set:{status:-1}}, {multi:true});
  }

  res.send("delete file ok");
});


var escapeRe = function(str) {
    var re = (str+'').replace(/[.?*+^$[\]\\/(){}|-]/g, "\\$&");
    return re;

    // replace unicode Then
    var ret = '';
    for(var i=0;i<re.length;i++) {
    	ret += /[\x00-\x7F]/.test(re[i])?re[i]: '\\u'+re[i].charCodeAt(0).toString(16);
    }
    return ret;
};

app.post("/removeFolder", function (req, res) {
  var data = req.body;

  if(data.deleteAll) col.update({path: new RegExp('^'+ escapeRe(data.path) ) }, {$set:{status:-1}}, {multi:true});
  res.send("delete folder ok");
});

app.post("/saveCanvas", function (req, res) {
  var pdfWidth = req.body.pdfWidth;
  var pdfHeight = req.body.pdfHeight;
  var totalPage = req.body.totalPage;
  var data = req.body.data;
  var file = req.body.file;
  var person = req.body.person;
  var personName = req.body.personName;
  var isSilent = req.body.isSilent;
  var shareID = parseInt( req.body.shareID );

  var filename = file.replace(FILE_HOST, '');
  if(!shareID){
    col.update({role:'upfile', key:filename }, { $set: { drawData:data }  }, function(err, result){
      res.send(err);
    } );
  } else{
    col.findOneAndUpdate({role:'share', shareID:shareID, 'files.key':filename }, { $set: { 'files.$.drawData':data, totalPage:totalPage, pdfWidth:pdfWidth, pdfHeight:pdfHeight }  },
                        { projection:{'files':1, msg:1, fromPerson:1, toPerson:1, flowName:1, isSign:1  } },
                        function(err, result){
      res.send(err);

      if(isSilent) return;

            var colShare = result.value;
            var file = colShare.files.filter(function(v){ return v.key==filename; })[0];
            var fileKey = file.key;
            var flowName = colShare.flowName;
            var msg = colShare.msg;
            var isSign = colShare.isSign;
            var overAllPath = util.format('%s#file=%s&shareID=%d&isSign=%d', VIEWER_URL, FILE_HOST+ encodeURIComponent(fileKey), shareID, isSign?1:0 ) ;
            var content =
            colShare.isSign?
            util.format('/流程%d %s (%s-%s)/标注已由%s更新，<a href="%s">查看文件</a>',
                    shareID,
                    msg,
                    colShare.flowName,
                    colShare.fromPerson[0].name,
                    personName,
                    overAllPath  // if we need segmented path:   pathName.join('-'),
                  ) :
            util.format('/共享%d %s (%s)/标注已由%s更新 <a href="%s">查看文件</a>',
                    shareID,
                    msg,
                    colShare.fromPerson[0].name,
                    personName,
                    overAllPath  // if we need segmented path:   pathName.join('-'),
                  )


             var wxmsg = {
               "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
               "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
               "msgtype": "text",
               "text": {
                 "content":content
               },
               "safe":"0",
                date : new Date(),
                role : 'shareMsg',
                shareID:shareID
              };

              sendWXMessage(wxmsg, person);

    } );
  }

});


app.post("/saveInputData", function (req, res) {
  var textID = req.body.textID;
  var value = req.body.value;
  var file = req.body.file;
  var shareID = parseInt( req.body.shareID );
  try{
    var filename = file.replace(FILE_HOST, '');
  }catch(e){
    return res.send("");
  }
  if(!shareID){
    var obj = {};
    obj['inputData.'+textID.replace(/\./g, '\uff0e')] = value;
    col.update({role:'upfile', 'key':filename }, { $set: obj  }, function(err, result){
    	return res.send("OK");
    });
  } else {
  	// have to replace keys that contains dot(.) in keyname,
  	// http://stackoverflow.com/questions/12397118/mongodb-dot-in-key-name
    var obj = {};
    obj['files.$.inputData.'+textID.replace(/\./g, '\uff0e')] = value;
    col.update({ role:'share', shareID:shareID, 'files.key':filename }, { $set: obj  }, function(err, result){
    	return res.send("OK");
    });
  }

});


app.post("/getInputData", function (req, res) {
  var file = req.body.file;
  var shareID = parseInt( req.body.shareID );
  try{
    var filename = file.replace(FILE_HOST, '');
  }catch(e){
    return res.send("");
  }
  if(!shareID){
    col.findOne({ role:'upfile', 'key':filename },  {fields: {'inputData':1} }, function(err, result){
      if(!result) return res.send("");
    	//convert unicode Dot into [dot]
    	var data = {};
    	_.each(result.inputData, function(v,k){
    		data[k.replace(/\uff0e/g, '.')] = v;
    	});
    	return res.json( data );
    });
  } else {
    col.findOne({ role:'share', shareID:shareID, 'files.key':filename },  {fields: {'files.key.$':1} }, function(err, result){
      if(!result) return res.send("");
    	//convert unicode Dot into [dot]
    	var data = {};
    	_.each( result.files[0].inputData , function(v,k){
    		data[k.replace(/\uff0e/g, '.')] = v;
    	});
    	return res.json( data );
    });
  }

});

app.post("/getSavedSign", function (req, res) {
  var file = req.body.file;
  var person = req.body.person;
  var shareID = parseInt( req.body.shareID );

  try{
    var filename = file.replace(FILE_HOST, '');
  }catch(e){
    return res.send("");
  }


    // common function to generate SignData
    function getSignData(err, docs, fromUserId, curID, totalPage, pdfWidth, pdfHeight){

      if(err||!docs) { return res.send({curID:null, totalPage:totalPage,pdfWidth:pdfWidth,pdfHeight:pdfHeight, signIDS: []}); }
      var ids = docs.filter(function(v){ return v.signData } ).map(function  (v) {
        return new ObjectID( v.signData );
      });

      col.find({_id:{$in:ids}}, {sort:{_id:1}}).toArray(function (err, items) {
        if(!items) return res.send('');
        docs.forEach(function  (v,i) {

          // Populate Signed Data into v.sign
          var t = items.filter(function(x){
            if(!v.signData) return false;
            return x&&x._id&& v && v.signData && (x._id.toHexString() == v.signData.toString() )
          });
          var sign = t.shift();

          v.sign = sign;

          if(fromUserId){
            // Populate UserInfo from PlaceHolder
            if(v.mainPerson) v.realMainPerson = placerholderToUser(fromUserId, v.mainPerson);
            if(v.person) v.realPerson = v.person.split('|').map( function(s){ return placerholderToUser(fromUserId, s) } );
          }

          var user;
          if(sign){
          	user = v.person==sign.person ? v.realPerson : getUserInfo(sign.person);
          	v.signPersonName = user.name;
          }

          if(!user) user = getUserInfo(v.signPerson||v.mainPerson);

          if(user) v.color = user.color;

        });

        res.send({curID:curID, totalPage:totalPage,pdfWidth:pdfWidth, pdfHeight:pdfHeight, signIDS: docs});

      });
    }



  if( !shareID ){

    col.findOne( {role:'upfile', 'key':filename },  { },  function(err, doc){

      if(err ||!doc) return res.send('');

      if(doc.signIDS){
        doc.signIDS.filter(function(v, i ){
          doc.signIDS[i] = safeEvalObj(v, true);
        });
      }

      getSignData(err, doc.signIDS , person, null, doc.totalPage, doc.pdfWidth, doc.pdfHeight );
    });


  } else {
    // col.find({role:'sign', shareID:shareID, file:file, signData:{$exists:true} }, {sort:{signData:1}}).toArray(function(err, docs){
    // col.find({role:'sign', shareID:shareID, file:file }, { }).toArray(function(err, docs){

    // For role:'sign', if it's no shareID, then it's template, else it's RealSignData

    if(shareID){

        col.findOne( {role:'share', shareID:shareID, 'files.key':filename },  {  },  function(err, doc){
          	//return console.log(err, doc);
          	if(err ||!doc) return res.send('');

            var file = doc.files.filter(function(v){ return v.key == filename }).shift();
          	if(!file) return res.send('');

              var curFlowPos = doc.curFlowPos||0;
              var curID = doc.isSign&&!doc.isFinish ? file.signIDS[curFlowPos]._id : null;

              if(file.signIDS){

                file.signIDS.filter(function(v, i ){
                  file.signIDS[i] = safeEvalObj(v, true);
                });

                file.signIDS = file.signIDS.filter(function(v, i ){
                  return !v.isFlow || (v.isFlow && v.order<= curFlowPos+1 );
                });

                getSignData(err, file.signIDS , doc.fromPerson.shift().userid, curID, file.totalPage, file.pdfWidth, file.pdfHeight );
              }
              else res.send( {curID:null, totalPage:file.totalPage,pdfWidth:file.pdfWidth,pdfHeight:file.pdfHeight, signIDS: [] } );

          } );

    } else {

      col.findOne({ role:'upfile', key:filename } , {} , function(err, result) {

        if(err || !result ) return res.send('');

        var signIDS = result.signIDS;
        if(!signIDS ) return res.send('');

        getSignData(err, signIDS, person, result.totalPage, result.pdfWidth, result.pdfHeight );

      });


    }






  }

});


app.post("/getCanvas", function (req, res) {
  var file = req.body.file;
  var shareID = parseInt( req.body.shareID );
  try{
    var filename = file.replace(FILE_HOST, '');
  }catch(e){
    return res.send("[]");
  }
  if(!shareID){
    col.findOne({role:'upfile', key:filename }, function(err, result){
      if(!result){ return res.send("[]"); }
      res.send(result.drawData || "[]");
    } );
  } else{
    // below we want project result in array that only one element, like $elemMatch, see:
    //  http://stackoverflow.com/questions/29092265/elemmatch-search-on-array-of-subdocument
    col.findOne({role:'share', shareID:shareID, 'files.key':filename }, {fields: {'files.key.$':1} }, function(err, result){
      if(!result){ return res.send("[]"); }
      // var files = result.files.filter(function(v){
      //   return v.key == filename;
      // });
      res.send(result.files[0].drawData || "[]");
    } );
  }

});


app.post("/getFlowList", function (req, res) {

  col.find( { role:'flow' } , {sort:{name:1}, limit:500}).toArray( function(err, docs){
      if(err || !docs) {
        return res.send('');
      }
      res.send( docs );
  });
});




app.post("/getShareData", function (req, res) {
  var shareID = safeEval(req.body.shareID);
  var file = safeEval(req.body.file);
  if(!shareID) return res.send('');
  col.findOne( { 'shareID': shareID, role:'share', files: {$elemMatch:{ key:file }} } ,
      {limit:500, fields:{
        role:1, shareID:1, fromPerson:1, toPerson:1, curFlowPos:1, flowSteps:1,
        selectRange:1, fileIDS:1, isSign:1, isFinish:1, 'files.$':1
      } } ,
      function(err, item){
          if(err || !item) {
            return res.send('');
          }

          var data = {};
          _.each(item.files[0].inputData, function(v,k){
            data[k.replace(/\uff0e/g, '.')] = v;
          });
          item.files[0].inputData = data;

          res.send( item );
      });
});


app.post("/getShareFrom", function (req, res) {
  var person = req.body.person;
  var startShareID = safeEval(req.body.startShareID);
  var timeout = false;
  var connInter = setTimeout(function(){
    timeout = true;
    return res.send('');
  }, 15000);

  var condition = { 'fromPerson.userid': person, role:'share' };
  if(startShareID) condition.shareID = {$lt: startShareID };

  col.find( condition , {limit:50, fields:{ fileIDS:0, filePathS:0, selectRange:0, 'files.drawData':0,'files.inputData':0,'files.signIDS':0}, timeout:true} ).sort({shareID:-1}).toArray(function(err, docs){
      clearTimeout(connInter); if(timeout)return;
      if(err || !docs) {
        return res.send('error');
      }
      var count = docs.length;
      res.send( JSON.stringify(docs) );
  });
});

app.post("/getShareTo", function (req, res) {
  var person = req.body.person;
  var startShareID = safeEval(req.body.startShareID);
  var timeout = false;
  var connInter = setTimeout(function(){
    timeout = true;
    return res.send('');
  }, 15000);
  //col.aggregate([ {$match:{role:'share'}}, {$unwind:'$toPerson'}, { $match: {'toPerson.userid': person} } ] ).sort({shareID:-1}).toArray(function(err, docs){
  //col.find( { 'toPerson.userid': person, role:'share' } , {limit:500, timeout:true} ).sort({shareID:-1}).toArray(function(err, docs){
  var condition = { $or:[ {'toPerson.userid':person}, { 'toPerson':{$elemMatch: {$elemMatch:{'userid': person } } } } ], role:'share' };
  if(startShareID) condition.shareID = {$lt: startShareID };

  col.find( condition , {limit:50, fields:{fileIDS:0, filePathS:0, selectRange:0, 'files.drawData':0,'files.inputData':0,'files.signIDS':0},  timeout:true} ).sort({shareID:-1}).toArray(function(err, docs){
      clearTimeout(connInter); if(timeout)return;
      if(err || !docs) {
        return res.send('error');
      }
      var count = docs.length;
      docs.forEach(function(v){ v.toPerson = futurist.array_unique( _.flatten(v.toPerson) ) });

      res.send( JSON.stringify(docs) );
  });
});

app.post("/getShareMsg", function (req, res) {
  var fromPerson = req.body.fromPerson;
  var toPerson = req.body.toPerson;
  var shareID = parseInt(req.body.shareID);
  var hash = req.body.hash;
  var keyword = req.body.keyword;

  var condition = {  role:'shareMsg' };
  if(shareID) condition.shareID = parseInt(shareID,10);
  if(fromPerson) condition.fromPerson = fromPerson;

  function getMsg (shareA, hash) {
      if(!_.isArray(shareA) ) shareA = [shareA];


      shareA = shareA.map( function(v){ return parseInt(v) } );

      var condition = {  role:'shareMsg', shareID:{$in:shareA}, WXOnly:{$in:[null,false,'']} };

      var hashA = [null];
      if(hash) hashA = hashA.concat(hash);
      //if(hashA.length>1) condition.hash = {$in:hashA};

      col.find( condition , {} , {limit:500} ).sort({shareID:1, date:1}).toArray(function(err, docs){
          if(err || !docs) {
            return res.send('error');
          }
          var count = docs.length;

          col.find( {role:'share', shareID:{$in:shareA}}, {fields: {files:1,shareID:1, isSign:1, msg:1} }).toArray(function  (err, docs2) {
            //console.log(err, docs2);
            if(err){
              return res.end();
            }

            docs2.forEach(function  (v) {
              v.files = v.files.map(function  (f) {
                return { path:f.path, title:f.title, key:f.key }
              });
            });

            docs.unshift( {role:'files', docs: docs2 } );
            res.send( JSON.stringify(docs) );

          } );

      });
  }

  if(fromPerson){
    col.find( { 'fromPerson.userid': fromPerson, role:'share' }, {shareID:1, _id:0} , {limit:500} ).sort({shareID:1}).toArray(function(err, docs){
        if(err || !docs) {
          return res.send('error');
        }
        var count = docs.length;
        if(!count){
          return res.send('还没有消息');
        }
        getMsg( docs.map(function(v){return v.shareID}) );
    });
    return;
  }

  if(toPerson){
    col.find( { $or:[ {'toPerson.userid':toPerson}, { 'toPerson':{$elemMatch: {$elemMatch:{'userid': toPerson } } } } ], role:'share' }, {shareID:1, _id:0} , {limit:500} ).sort({shareID:1}).toArray(function(err, docs){
        if(err || !docs) {
          return res.send('error');
        }
        var count = docs.length;
        if(!count){
          return res.send('还没有消息');
        }
        getMsg( docs.map(function(v){return v.shareID}) );
    });
    return;
  }

  if(shareID) {
    getMsg(shareID, hash);
    return;
  }


  res.send('error');

});

// Save sign info into upfile, signIDS array, with no ShareID
app.post("/drawSign", function (req, res) {

  var pdfWidth =  req.body.pdfWidth;
  var pdfHeight =  req.body.pdfHeight;
  var totalPage =  req.body.totalPage;
  var data =  req.body.data;
  var shareID =  safeEval(req.body.shareID);
  var signPerson = data.signPerson;
  var file = data.file.replace(FILE_HOST, '') ;
  var page = data.page;
  var pos = data.pos;
  var isMobile = data.isMobile;
  var _id = data._id;

  data.isMobile = safeEval(data.isMobile);
  data.page = safeEval(data.page);
  data.scale = safeEval(data.scale);
  data.role = 'sign';
  data.date = new Date();
  data._id =  _id || +new Date()+Math.random().toString().slice(2,5)+'_';
  delete data.file;
  // delete data.signPerson;

  if(shareID){

    col.update( { role:'share', shareID:shareID, 'files.key':file }, { $push: { 'files.$.signIDS': data }, $set:{'files.$.totalPage':totalPage,'files.$.pdfWidth':pdfWidth,'files.$.pdfHeight':pdfHeight} }, function(err,result){
      console.log(err);
      if(err || !result) return res.send('');
      res.send(result);
    });

  } else {

    col.update( { role:'upfile', key:file }, { $push: { signIDS: data }, $set:{totalPage:totalPage,pdfWidth:pdfWidth,pdfHeight:pdfHeight,} }, function(err,result){
      console.log(err);
      if(err || !result) return res.send('');
      res.send(result);
    });

  }


});

app.post("/beginSign", function (req, res) {
  var data =  req.body.data;
  var signPerson = data.signPerson;
  var shareID = parseInt(data.shareID);
  var file = data.file;
  var page = data.page;
  var pos = data.pos;
  var isMobile = data.isMobile;

  data.isMobile = safeEval(data.isMobile);
  data.shareID = safeEval(data.shareID);
  data.page = safeEval(data.page);
  data.scale = safeEval(data.scale);
  data.role = 'sign';
  data.date = new Date();

  col.insertOne(data, {w:1}, function(err,result){
    var id = result.insertedId;
    res.send(id);
  });

});

app.post("/deleteSign", function (req, res) {
  var signID =  req.body.signID+'';
  var person =  req.body.person;
  var file =  req.body.file;
  var shareID = safeEval(req.body.shareID);

  var key = file.replace(FILE_HOST, '');

  if(!signID.length){
    return res.send('');
  }

  if(shareID){

    getSignIndex(shareID, key, signID, _relay);
    function _relay(err, ret) {
      //if(err||ret.signIdx===null) return res.end();

      var condition = { role:'share', shareID:shareID, 'files.key':key };
      condition['files.'+ret.fileIdx+'.signIDS.'+ret.signIdx+'.isSigned']={$ne:true};

      col.updateOne( condition , { $pull: { 'files.$.signIDS': {_id: signID } } }, function(err, ret){
        //console.log(shareID, key, signID, err, ret);
        if(err || !ret.result.nModified) return res.end();
        res.send('OK');
      }  );
    }

  } else {

    // http://stackoverflow.com/questions/19435123/using-pull-in-mongodb-to-remove-a-deeply-embedded-object
    col.updateOne({ role:'upfile', key:key, person:person, signIDS:{$elemMatch:{_id:signID, isSigned:{$ne:true} } } }, { $pull: { 'signIDS': {_id: signID } } }, function (err, ret) {
      if(err || !ret.result.nModified) return res.end();
      res.send('OK');
    }  );


  }


});

app.post("/deleteSignOnly", function (req, res) {
  var signID =  req.body.signID+'';
  var person =  req.body.person;
  var file =  req.body.file;
  var shareID =  safeEval( req.body.shareID);
  if(!file || !signID.length){
    return res.send('');
  }

  var fileKey = file.replace(FILE_HOST, '');

  	if(shareID){


      getSignIndex(shareID, fileKey, signID, _relay);

      function _relay(err, val) {
        if(err) return res.end();
        var fileIdx = val.fileIdx;
        var signIdx = val.signIdx;

        var unsetObj = {};
        unsetObj[ 'files.'+ fileIdx +'.signIDS.'+ signIdx +'.signData' ] = '';
        unsetObj[ 'files.'+ fileIdx +'.signIDS.'+ signIdx +'.isSigned' ] = '';

        col.findOneAndUpdate( {role:'share', shareID:shareID, 'files.key':fileKey, 'files.signIDS._id': signID },
          { $unset:unsetObj }, { projection:{ key:1, 'signIDS':1} }, function(err, result) {
              res.send( result );
            });
      }


  	} else {
  		col.findOneAndUpdate( {role:'upfile', 'key':fileKey, 'signIDS._id': signID },
			{ $unset:{'signIDS.$.signData': '', 'signIDS.$.isSigned': '' } }, { projection:{ key:1, 'signIDS':1} }, function(err, result) {
          res.send( result.value );
        });
  	}

});


function getSubStr (str, len) {
  len = len || 10;
  return str.length<=len? str : str.substr(0, len)+'...';
}


app.post("/getSignStatus", function (req, res) {
  var shareID = safeEval(req.body.shareID);
  var fileKey =  req.body.fileKey;
  var signID =  req.body.signID+'';

  if(shareID){
    getSignIndex( shareID, fileKey, signID, _relay );
    function _relay (err, ret) {

      if(err|| !ret || ret.signIdx===undefined ){
        return res.send('0');
      }

      var condition = {role:'share', shareID:shareID};
      condition['files.'+ret.fileIdx+'.signIDS.'+ret.signIdx+'.isSigned'] = true;

      col.findOne(condition, function  (err, ret) {

        res.send( ret? '1' : '0' );

      });

    }
  } else {

      col.findOne( { key:fileKey, 'signIDS':{$elemMatch:{_id:signID}} }, {fields: {'signIDS.$':1} }, function  (err, ret) {

        res.send( ret&&ret.signIDS.length&&ret.signIDS[0].isSigned ? '1' : '0' );

      });

  }


  return;

  if(shareID){
      col.findOne({role:'share', shareID:shareID, 'selectRange.signID': signID },
        { fields:{ selectRange: { $elemMatch:{ signID:signID } } } },
        function  (err, ret) {

          if(err||!ret) return res.send('');
          var data = ret.selectRange.shift();
          res.send( ''+ (data.isSigned?1:0) );

      });
  }

});

app.post("/getSignStatus3", function (req, res) {
  var shareID = safeEval(req.body.shareID);
  var signID =  req.body.signID+'';

  if(shareID){
      col.aggregate( [ {$match:{role:'share', shareID:shareID} }, {$unwind:'$files'}, {$unwind:'$files.signIDS'}, {$match:{ 'files.signIDS._id':signID }}, {$project: {'files.signIDS':1} } ], function(err, ret) {

        if(err||!ret) return res.send('');
        var data = ret.shift().files.signIDS;
        res.send( ''+ (data.signData?1:0) );

      });
  }

});

app.post("/getSignStatus2", function (req, res) {
  var shareID = safeEval(req.body.shareID);
  var person =  req.body.person;
  var signID =  req.body.signID+'';
  var curFlowPos =  safeEval(req.body.curFlowPos);
  col.findOne({role:'share', shareID:shareID }, function  (err, ret) {
    if(err||!ret) return res.send('');
    if(person){
      res.send( ''+ (ret.selectRange[ret.curFlowPos].isSigned?1:0) );
    } else {
      res.send( ''+ (ret.selectRange[curFlowPos].isSigned?1:0) );
    }

  }  );
});

app.post("/finishSign", function (req, res) {
  var shareID =  safeEval(req.body.shareID);
  var person =  req.body.person;
  var fileKey =  req.body.fileKey;
  var signID =  req.body.signID+'';

  if(!shareID){

        var condition = { role:'upfile', key:fileKey, 'signIDS':{$elemMatch:{'_id':signID, signData:{$exists:true} } }  };

        col.updateOne( condition , { $set:{ 'signIDS.$.isSigned': true } }, function (err, ret) {
          if(err || ret.matchedCount==0 ) return res.send('签名应用错误');
          res.send('签名应用成功');

        } );


  } else {


        getSignIndex( shareID, fileKey, signID, _relay );

        function _relay(err, indexVal) {

          if(err) return res.end();

          var fileIdx = indexVal.fileIdx;
          var signIdx = indexVal.signIdx;

          col.findOne({shareID:shareID, role:'share'}, function(err, colShare) {
            var signImg = colShare.files[fileIdx].signIDS[signIdx];
            signImg = safeEvalObj(signImg);

            if(!signImg.isFlow){
              // we sign a file not a flow

                  var selPosObj = {};
                  selPosObj['files.'+fileIdx+'.signIDS.'+signIdx+'.isSigned'] = true;
                  var updateObj = { $set: selPosObj };

                  var condition = {role:'share', shareID:shareID };
                  condition['files.'+fileIdx+'.signIDS.'+signIdx+'.signData'] = {$exists:true};

                  col.updateOne( condition, updateObj, function  (err, ret) {

                  	if(err|| ret.result.nModified==0) return res.send('签名应用错误');
                  	res.send('签名应用成功');

                    var wxmsg = {
                     "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
                     "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
                     "msgtype": "text",
                     "text": {
                       "content":
                       util.format('%s 文件 %s 增加了新的签名：%s, <a href="%s">查看文件</a>',

                          (colShare.isSign?'流程':'共享') + colShare.shareID + '('+ colShare.fromPerson[0].name + ' '+ (colShare.isSign?colShare.flowName : colShare.msg) +')',

                          colShare.files[fileIdx].title,

                          getUserInfo( person ).name,

                          makeViewURL( colShare.files[fileIdx].key, shareID, colShare.isSign )
                        )
                     },
                     "safe":"0",
                      date : new Date(),
                      role : 'shareMsg',
                      shareID:shareID
                    };

                    sendWXMessage(wxmsg, person);

                  });



            } else {


                // we are sign a flow document


                  if(colShare.isFinish) return res.send('');

                  var flowName = colShare.flowName;
                  var curFlowPos = colShare.curFlowPos+1;
                  var file = colShare.files[fileIdx];

                  var fileKey = file.key;
                  var flowName = colShare.flowName;
                  var msg = colShare.msg;
                  var title = getSubStr( '流程'+shareID+flowName+ (msg), 50);
                  var overAllPath = util.format('%s#file=%s&shareID=%d&isSign=1', VIEWER_URL, FILE_HOST+ encodeURIComponent(fileKey), shareID ) ;



                  var selPosObj = {};
                  var selPos = 'selectRange.'+ (curFlowPos-1) + '.isSigned';
                  selPosObj[selPos] = true;
                  selPosObj['files.'+fileIdx+'.signIDS.'+signIdx+'.isSigned'] = true;


                  var condition = {role:'share', shareID:shareID };
                  condition[ 'files.'+fileIdx+'.signIDS.'+signIdx+'.isSigned' ] = {$ne:true};
                  condition[ 'files.'+fileIdx+'.signIDS.'+signIdx+'.signData' ] = {$exists:true};


                  var prevPerson = colShare.selectRange.slice(0,curFlowPos);
                  var nextPerson = colShare.selectRange[curFlowPos];
                  var curPerson = _.last(prevPerson);

                  var toPerson = colShare.toPerson;


                  if(curFlowPos >= colShare.selectRange.length){


                        wsBroadcast( {role:'share', isFinish:true, key:fileKey, data:colShare } );


                      selPosObj.isFinish = true;

                      var updateObj = { $set: selPosObj, $inc:{curFlowPos:1} };

                      var lastStep = colShare.flowSteps.slice(colShare.selectRange.length).shift();

                      if( lastStep ) {

                        var lastPersons = lastStep.person.map(function(x){
                          return placerholderToUser( colShare.fromPerson[0].userid, x );
                        });

                        updateObj['$push'] = { toPerson: lastPersons };

                        var content =  util.format( '流程%d %s (%s-%s)已结束，转交至%s处理',
                                    colShare.shareID,
                                    msg,
                                    colShare.flowName,
                                    colShare.fromPerson[0].name,
                                    lastPersons.map(function(x){ return x.depart+'-'+x.name }).join(',')
                                    );


                        var wxmsg = {
                         "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson).concat(lastPersons) ).map(function(v){return v.userid}).join('|'),
                         "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson).concat(lastPersons) ).map(function(v){return v.name}).join('|'),
                         "msgtype": "text",
                         "text": {
                           "content":
                           util.format('/流程%d %s (%s-%s)/已由%s签署,此流程已结束并转交至：%s, <a href="%s">查看文件</a>',
                              colShare.shareID,
                              msg,
                              colShare.flowName,
                              colShare.fromPerson[0].name,
                              curPerson.depart+'-'+curPerson.name,
                              lastPersons.map(function(x){ return x.depart+'-'+x.name }).join(','),
                              overAllPath  // if we need segmented path:   pathName.join('-'),
                            )
                         },
                         "safe":"0",
                          date : new Date(),
                          role : 'shareMsg',
                          shareID:shareID
                        };



                      } else {

                      	var content = util.format( '流程%d %s (%s-%s)已结束，系统将通知相关人员知悉',
                                    colShare.shareID,
                                    msg,
                                    colShare.flowName,
                                    colShare.fromPerson[0].name );


                        var wxmsg = {
                         "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
                         "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
                         "msgtype": "text",
                         "text": {
                           "content":
                           util.format('/流程%d %s (%s-%s)/已由%s签署,此流程已结束 <a href="%s">查看文件</a>',
                              colShare.shareID,
                              msg,
                              colShare.flowName,
                              colShare.fromPerson[0].name,
                              curPerson.depart+'-'+curPerson.name,
                              overAllPath  // if we need segmented path:   pathName.join('-'),
                            )
                         },
                         "safe":"0",
                          date : new Date(),
                          role : 'shareMsg',
                          shareID:shareID
                        };


                      }




                      col.updateOne(condition, updateObj, function  (err, ret) {

                      	if(err||ret.result.nModified==0) return res.send('签名应用错误，请重新打开页面再试');

                      	res.send(content);
                      	sendWXMessage(wxmsg);


                      });


                } else {



                	var nextGroup = colShare.flowSteps[curFlowPos].person.map(function(x){
                	  return placerholderToUser( colShare.fromPerson[0].userid, x );
                	});


                    col.updateOne( condition, { $push: { toPerson: nextGroup }, $set:selPosObj, $inc:{curFlowPos:1} }, {w:1}, function(err, ret) {

                    	if(err||ret.result.nModified==0) return res.send('签名应用错误，请重新打开页面再试');

	                      //info to all person about the status
	                      var wxmsg = {
	                       "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
	                       "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
	                       "msgtype": "text",
	                       "text": {
	                         "content":
	                         util.format('流程%d %s (%s-%s)已由 %s 签署,此流程已转交给下一经办人：%s <a href="%s">查看文件</a>',
	                            colShare.shareID,
	                            msg,
	                            colShare.flowName,
	                            colShare.fromPerson[0].name,
	                            curPerson.depart+'-'+curPerson.name,
	                            nextPerson.name,
	                            overAllPath  // if we need segmented path:   pathName.join('-'),
	                          )
	                       },
	                       "safe":"0",
	                        date : new Date(),
	                        role : 'shareMsg',
	                        shareID:shareID
	                      };

	                      sendWXMessage(wxmsg);


	                      //info to next Person via WX
	                      var wxmsg = {
	                       "touser": nextGroup.map(function(x){ return x.userid }).join('|'),
	                       "touserName": nextGroup.map(function(x){ return x.name }).join('|'),
	                       "msgtype": "text",
	                       "text": {
	                         "content":
	                         util.format('流程%d %s (%s-%s)需处理, 本组成员：(%s), 前置签署：%s。<a href="%s">查看文件</a>',
	                            colShare.shareID,
	                            msg,
	                            colShare.flowName,
	                            colShare.fromPerson[0].name,
	                            nextGroup.map(function(x){ return x.name }).join(','),
	                            prevPerson.map(function(x){return x.depart+'-'+x.name}).join(','),
	                            overAllPath  // if we need segmented path:   pathName.join('-'),
	                          )
	                       },
	                       "safe":"0",
	                        date : new Date(),
	                        role : 'shareMsg',
	                        privateShareID:shareID
	                      };

	                      _.delay(function  () {
	                        sendWXMessage(wxmsg);
	                      }, 3000);


                        res.send( util.format( '流程%d(%s-%s)已转交给下一经办人：\n%s',
                                colShare.shareID,
                                colShare.flowName,
                                colShare.fromPerson[0].name,
                                nextPerson.depart+'-'+nextPerson.name ) );

                      });

                      // col.update({role:'share', shareID:shareID }, {$set: selPosObj } ) ;


                 }

                  // col.findOne({role:'flow', name:flowName }, function(err, colFlow){});




            }


          } );
        }





  }




});



app.post("/saveSignFlow", function (req, res) {
  var pdfWidth =  req.body.pdfWidth;
  var pdfHeight =  req.body.pdfHeight;
  var totalPage =  req.body.totalPage;
  var signIDS =  req.body.signIDS;
  var key =  req.body.key;
  var pageWidth =  req.body.pageWidth;
  var pageHeight =  req.body.pageHeight;

  /*
  var selectRange = signIDS.map(function(v){
    var obj = _.pick(v, '_id', 'person', 'mainPerson', 'order' );
    obj.person = obj.person.split('|').filter(function(v){ return v!='' });
    obj.order = safeEval(obj.order);
    return obj;
  }).sort(function(a,b){
    return (a.order||999)-(b.order||999);
  });
  */

  col.findOneAndUpdate( {role:'upfile', key:key}, {$set: { totalPage:totalPage, pdfWidth:pdfWidth, pdfHeight:pdfHeight, signIDS: signIDS, flowSteps:[], templateImage:null } }, {projection:{title:1, key:1}},  function(err, result){
    console.log(err, result);
    if(err||!result) return res.send('');

    res.send('ok');

    var token = +new Date();
    var filename = key.split('/').pop();
	var cmd = 'phantomjs --config=client/config client/template.js '+ FILE_HOST + key + ' ' + pageWidth + ' ' + pageHeight ;
  console.log(cmd);

	var child = exec(cmd, function(err, stdout, stderr) {

	    if(err) return console.log(cmd, err, stdout, stderr);

	    qiniu_uploadFile( 'uploads/'+ filename +'.jpg', token +'/'+ filename +'.jpg', function(ret) {

	        col.updateOne( {role:'upfile', key:key}, {$set: { templateImage: ret.key } }, function(err, ret){
	        	console.log(err, ret.result);
	        });

	    } );


	});

  } );

});

app.post("/saveSignFlow2", function (req, res) {
  var signIDS =  req.body.signIDS;
  var key =  req.body.key;
  col.findOneAndUpdate( {role:'upfile', key:key}, {$set: { signIDS: signIDS } }, {projection:{title:1, key:1}},  function(err, result){
    // console.log(err, result);
    if(err||!result) return res.send('');
    res.send('ok');

    var flowName = result.value.title;
    var stuffs = signIDS.forEach(function(v, i){

      if(v.person=='_self') {
        v.level = -100;
        return;
      }

      if(v.person=='_parent') {
        v.level = -50;
        return;
      }

      STUFF_LIST.some(function(s){
        if(s.userid==v.person){
          signIDS[i] = _.extend( v, s );
          return true;
        }
      });
    });

    signIDS.sort(function(a,b){
      return a.level>b.level;
    });

    var flowPerson = signIDS.map(function(v){
      var ret = v.userid
                ? { name:v.name, userid:v.userid, depart:v.depart, level:v.level  }
                : { name:v.name, userid:v.person, depart:v.depart, level:v.level  }

      return ret;
    });

    col.updateOne({role:'flow', key:key}, {$set:{ role:'flow', key:key, name:flowName, date:new Date(), flowPerson:flowPerson  }}, {upsert:true}, function(err, result){

    } );

  } );

});


function getSignIndex (shareID, fileKey, signID, callback) {
  col.mapReduce(
            function() {
              var fileIdx, signIdx;

              if(fileKey){
                this.files.some(function(v,i){ if(v.key==fileKey) return fileIdx=i; });
              }

              if(signID) {

                if(fileIdx){

                  this.files[fileIdx].signIDS.some(function(v,i){ if(v._id==signID) return signIdx=i; });

                } else {
                  this.files.some(function(v,i){
                    return v.signIDS && v.signIDS.some(function(sign,sid){
                      if(sign._id==signID){
                        fileIdx = i;
                        signIdx = sid;
                        return true;
                      }
                    });
                  });
                }

              }

              emit(this._id, {fileIdx:fileIdx, signIdx:signIdx} );
            },
            function() {},
            {
              "out": { "inline": 1 },
              "query": { shareID:shareID, "files.key": fileKey },
              "scope": {fileKey:fileKey, signID:signID}
            },
            function(err, ret) {
              if(err) return callback(err, null);
              var val = ret.shift().value;
              callback(null, val);

            });
}

app.post("/saveSign", function (req, res) {
  var data =  req.body.data;
  var signID =  req.body.signID+'';
  var fileKey =  req.body.fileKey;
  var shareID =  safeEval(req.body.shareID);
  var hisID =  req.body.hisID;
  var width =  safeEval(req.body.width);
  var height =  safeEval(req.body.height);
  var person =  req.body.signPerson;
  var curFlowPos = safeEval(req.body.curFlowPos);

      function insertHis(id){
      	if(shareID){

          getSignIndex( shareID, fileKey, signID, _relay );

      		function _relay (err, val) {

            console.log(shareID, fileKey, signID, err, val);

            if(err) return res.end();

            var fileIdx = val.fileIdx;
            var signIdx = val.signIdx;

            var key1 = 'files.'+ fileIdx +'.signIDS.'+signIdx+'.signData';
            var setObj = {};
            setObj[key1] =  new ObjectID(id);

            var condition = {role:'share', shareID:shareID, 'files.key':fileKey };

            condition['files.'+fileIdx+'.signIDS._id'] = signID;
            condition['selectRange.'+curFlowPos+'.isSigned'] = {$ne: true };

            var projection = {  };
            projection[ 'files' ] = {$elemMatch: {key: fileKey} }

            // console.log(condition, setObj, projection);
            // BELOW WILL THROW ERROR: exception: Cannot use $elemMatch projection on a nested field (currently unsupported).
            // projection[ 'files.'+fileIdx+'.signIDS' ] = {$elemMatch: {_id: signID} }

            // http://stackoverflow.com/questions/18986505/mongodb-array-element-projection-with-findoneandupdate-doesnt-work
             col.findOneAndUpdate( condition, { $set: setObj }, { projection:projection  } , function(err, result) {

                  if(err || !result ) {
                    console.log(err);
                    return res.send('');
                  }

                  try{var ret=result.value.files.shift().signIDS.filter(function(v){ return v._id==signID }).shift() ; }
                  catch(e){
                    return res.send('');
                  }

                  res.send( ret );


              });
            }




      	} else {


      		col.findOneAndUpdate( {role:'upfile', 'key':fileKey, 'signIDS._id': signID },
  				  { $set:{'signIDS.$.signData': new ObjectID(id) } },
            { projection:{ key:1, 'signIDS':1} }, function(err, result) {

            if(err) return res.send('');

            try{var ret=result.value.signIDS.filter(function(v){ return v._id==signID }).shift(); }
            catch(e){
            	return res.send('');
            }

	          res.send( ret );

	        });
      	}

      }

      if(hisID){
        insertHis(hisID);
      }else{

        col.insertOne( {role:'signBase', person:person, signData: data, width:width, height:height, date:new Date() }, {w:1}, function(err, result){
          // WHEN upserted, Will get insertID like this:
          // var id = result.upsertedCount ? result.upsertedId._id : 0;
          var id = result.insertedId;
          insertHis(id);

        });
      }



});


app.post("/getSignHistory", function (req, res) {
  var signID =  req.body.signID+'';
  var person =  req.body.person;


    col.find({role:'signBase', person:person}, {limit:5, sort:{date:-1} }).toArray(function(err, docs){
      if(err || !docs.length){
        return res.send("");
      }
      //col.deleteMany({role:'signBase', person:person, date:{$lt: docs[docs.length-1].date } });
      res.send( docs );
    });

});


function SendShareMsg(req, res) {
  var person = req.body.person;
  var text = req.body.text;
  var status = req.body.status;
  var shareID = parseInt(req.body.shareID);
  var path = req.body.path;
  var hash = req.body.hash;
  var fileName = req.body.fileName;
  var fileKey = req.body.fileKey;

  if(path) path = path.slice(1);
  else path = [];

  var fileHash = path.pop();

  col.findOne( { role:'share', shareID:shareID }, { fields:{files:0} }, function(err, data) {
      if(err||!data) {
        return res.send('');	//error
      }

      if(!data){
          return res.send('');	//此共享已删除
        }

      var users = data.fromPerson.concat(data.toPerson).filter(function(v){return v.userid==person});
      if(!users.length){
        return res.send('');	//没有此组权限
      }

      if(status){
        col.updateOne( { role:'share', shareID:shareID }, { $set:{statusText:text, statusDate:new Date() } }, function(err, data) {
        });
      }

      if(path.length){
        //get segmented path, Target Path segment and A link
        var pathName = [];
        path.forEach(function(v,i){
          var a = '/'+path.slice(0,i+1).join('/')+'/';
          pathName.push( util.format('<a href="%s#path=%s&shareID=%d">%s</a>', TREE_URL, encodeURIComponent(a), shareID, v) );
        });
        if(fileHash) {
          var a =  '/'+path.join('/')+'/' + fileHash;
          pathName.push( util.format('<a href="%s#path=%s&shareID=%d">%s</a>', TREE_URL, encodeURIComponent(fileKey), shareID, fileName) );
       }

       // get OverAllink
        var a = '/'+path.join('/')+'/';
        var link = a;
        if(fileName && fileKey ){
          link = a+fileKey;
          a = a +fileName;
        }
    } else {

      var link = getShareName(data, true);
    }


     var overAllPath = util.format('<a href="%s#path=%s&shareID=%d&openMessage=1">%s</a>', TREE_URL, encodeURIComponent(link), shareID, a ) ;

      var msg = {
       "touser": data.toPerson.concat(data.fromPerson).map(function(v){return v.userid}).join('|'),
       "touserName": data.toPerson.concat(data.fromPerson).map(function(v){return v.name}).join('|'),
       "msgtype": "text",
       "text": {
         "content":
         util.format('%s 对%s ' +  (status?'设置了状态':'留言') + '：%s',
            users[0].name,
            overAllPath,  // if we need segmented path:   pathName.join('-'),
            text
          )
       },
       "safe":"0",
        date : new Date(),
        role : 'shareMsg',
        shareID:shareID
      };
      if(hash) msg.hash = hash;

      msg.status = status;
      msg.appRole = 'chat';
      sendWXMessage(msg, person);

      res.send( msg );

      //wsBroadcast(msg);

  });



}
app.post("/sendShareMsg", SendShareMsg);


app.post("/getAllShareID", function (req, res) {

  var data = req.body;
  var person = data.person;

  col.find( {role:'share', isSign:{$in:[null,'',false]}, isFinish:{$in:[null,'',false]}, $or:[ {'fromPerson.userid':person}, {'toPerson.userid':person}, { 'toPerson':{$elemMatch: {$elemMatch:{'userid': person } } } } ]  }
      , { limit: 1000, sort:{ shareID:-1 }, fields: {shareID:1, msg:1, fromPerson:1, toPerson:1 } }).toArray(function(err, result) {
      if(err) return res.send('');
      res.send(result);
  } );

});


app.post("/shareFile", function (req, res) {
  var data = req.body.data;
  try{
  data = JSON.parse(data);
  //data.files = JSON.parse(data.files);
  }catch(e){ return res.send(''); }
  data.date = new Date();

  // return console.log( data );



  function addShareFiles (files) {

    files.forEach(function(v, i){
      v.path = data.filePathS[ v.key.replace(/\./g, '\uff0e') ];
    });
    data.files = files;

      if(data.existShareID){

        data.existShareID = safeEval( data.existShareID );
        col.findOneAndUpdate( {role:'share', shareID: data.existShareID }, { $addToSet: { files: {$each:data.files} } }, function(err, result){
          if(err) return res.send('');

          var colShare = result.value;
          res.send(colShare);

          var shareID = colShare.shareID;
          var shareName = util.format('共享%d(%s)[%s]', shareID, colShare.msg, colShare.toPerson.map(function(v){return v.name}).join(',') );

            var overAllPath = util.format('%s#path=%s&shareID=%d', TREE_URL, encodeURIComponent( shareName+data.files[0].key ), shareID ) ;
            var wxmsg = {
             "touser": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.userid}).join('|'),
             "touserName": _.flatten(colShare.toPerson.concat(colShare.fromPerson)).map(function(v){return v.name}).join('|'),
             "msgtype": "text",
             "text": {
               "content":
               util.format('/%s/添加了新文件：%s; 操作者：%s%s <a href="%s">查看共享</a>',
                  shareName,
                  data.files.map(function(v){
                    return util.format('<a href="%s#file=%s&shareID=%d&isSign=%d">%s</a>',
                      VIEWER_URL,
                      FILE_HOST+ encodeURIComponent(v.key),
                      shareID,
                      colShare.isSign?1:0,
                      v.title
                       )
                  }).join(','),
                  data.fromPerson[0].name,
                  data.msg? ', 附言：'+data.msg : '',
                  overAllPath  // if we need segmented path:   pathName.join('-'),
                )
             },
             "safe":"0",
              date : new Date(),
              role : 'shareMsg',
              shareID:shareID
            };

            sendWXMessage(wxmsg, data.fromPerson[0].userid);


        } );

      } else {

        insertShareData(data, res);


      }

  }

  if(data.oldShareID){

    col.findOne( {role:'share', shareID:data.oldShareID, 'files.key':{ $in: data.fileIDS } }, { sort:{ 'files.key':1 } }, function  (err, ret) {
      var files = ret.files.filter(function(v){ return data.fileIDS.indexOf(v.key)>-1 });
      //console.log(err, files)
      addShareFiles(files);
    });

  }else{
    col.find( {role:'upfile', key:{ $in: data.fileIDS } }, { sort:{ key:1 } } ).toArray(function  (err, files) {
      addShareFiles(files);
    });
  }


});


function insertShareData (data, res, showTab){


            col.findOneAndUpdate({role:'config'}, {$inc:{ shareID:1 } }, function  (err, result) {

              var shareID = result.value.shareID+1;
              data.shareID = shareID;
              data.role = 'share';

              col.insert(data, {w:1}, function(err, r){
                //res.send( {err:err, insertedCount: r.insertedCount } );
                if(!err){

                  if(!data.isSign){

                    // it's not empty topic ,it's file share
                    if( data.files.length ){

                      var treeUrl = TREE_URL + '#path=' + data.files[0].key +'&shareID='+ shareID;
                      var content = util.format('%s创建了/共享%d%s/，相关文档：%s，收件人：%s\n%s',
                          data.fromPerson.map(function(v){return '【'+v.depart + '-' + v.name+'】'}).join('|'),
                          shareID,
                          data.msg?'-'+data.msg:'',
                          // data.files.length,
                          data.files.map(function(v){return '<a href="'+ makeViewURL(v.key, shareID) +'">'+v.title+'</a>'}).join('，'),
                          data.selectRange.map(function(v){
                            return v.depart? ''+v.depart+'-'+v.name+'' : '【'+v.name+'】' }).join('；'),
                          '<a href="'+ treeUrl +'">查看共享</a>'
                        );

                  } else {
                    // it's empty topic

                    var treeUrl = TREE_URL + '#path=&shareID='+ shareID;
                      var content = util.format('%s创建了新话题/共享%d%s/，收件人：%s\n%s',
                          data.fromPerson.map(function(v){return '【'+v.depart + '-' + v.name+'】'}).join('|'),
                          shareID,
                          data.msg?'-'+data.msg:'',
                          data.selectRange.map(function(v){
                            return v.depart? ''+v.depart+'-'+v.name+'' : '【'+v.name+'】' }).join('；'),
                          '<a href="'+ treeUrl +'">查看共享</a>'
                        );
                  }

                  } else {
                    var treeUrl = makeViewURL(data.files[0].key, shareID, 1);
                    var content = util.format('/流程%d %s/发起了流程：%s，文档：%s，经办人：%s%s\n%s',
                        shareID,
                        data.fromPerson.map(function(v){return '【'+v.depart + '-' + v.name+'】'}).join('|'),
                        data.flowName,
                        data.files.map(function(v){return ''+v.title+''}).join('，'),
                        data.selectRange.map(function(v){
                          return v.depart? ''+v.depart+'-'+v.name+'' : '【'+v.name+'】' }).join('；'),
                        data.msg ? '，附言：\n'+data.msg : '',
                        '<a href="'+ treeUrl +'">查看文件</a>'
                      );
                  }
                  var msg = {
                   "touser": _.flatten( data.toPerson.concat(data.fromPerson) ).map(function(v){return v.userid}).join('|'),
                   "touserName": _.flatten( data.toPerson.concat(data.fromPerson) ).map(function(v){return v.name}).join('|'),
                   "msgtype": "text",
                   "text": {
                     "content": content
                   },
                   "safe":"0",
                    date : new Date(),
                    role : 'shareMsg',
                    shareID:shareID
                  };
                  sendWXMessage(msg, data.fromPerson[0].userid);
                  res.send( data );

                  data.openShare = false;
                  data.openMessage = false;
                  data.showTab = showTab;
                  wsBroadcast(data);

                }
              });

              } );


}


function sendWXMessage (msg, fromUser) {

  var wxMsg = JSON.parse(JSON.stringify(msg));
  var sharePath = JSON.stringify(msg).replace(/<[^>]+>/g,'').match(/\/[^/]+\//);
  sharePath = sharePath? sharePath.pop() : '';

  if(!msg.msgID){
    msg.msgID = NewID();
  }
  if(!msg.tryCount){
    var wsMsg = _.extend(msg, {fromUser: fromUser});
    if(msg.titleTrail) wsMsg.news.articles[0].title += msg.titleTrail;
    col.insert( wsMsg );
    msg.tryCount = 1;

    if(!msg.WXOnly){
	    // send client message vai ws
	    var touser = _.uniq( msg.touser.split('|').concat(fromUser) );
      	console.log( 'send client message vai ws', touser );
	    touser.forEach(function sendToUserWS (v) {
	      if(v) wsSendClient(v, wsMsg);
	    });
    }


    if(sharePath && msg.shareID){
      if(wxMsg.text) {
        wxMsg.text.content += '\n\n<a href="'+ SHARE_MSG_URL +'#path='+ sharePath +'&shareID='+ msg.shareID +'&msgID='+ (msg.msgID||'') +'">打开会话</a>';
      }
      if(wxMsg.news) {
        wxMsg.news.articles.forEach(function(v){
          v.url+='&msgID='+(msg.msgID||'')
        });
      }
    }

  }

  var msgTo = {};
  if(msg.touser) msgTo.touser = msg.touser;
  if(msg.toparty) msgTo.toparty = msg.toparty;
  if(msg.totag) msgTo.totag = msg.totag;
  // delete msg.touser;
  // delete msg.toparty;
  // delete msg.totag;


  (msg.appRole=='chat'?api2:api).send(msgTo, wxMsg, function  (err, result) {
    console.log('sendWXMessage', msg.tryCount, err, result);
    if(err){
      if(msg.tryCount++ <=5)
        setTimeout( function(){
          sendWXMessage(msg, fromUser);
        },1000);
      return ('error');
    }
    return "OK";
  });
}

app.listen(88);
console.log("Listening");


/******** DB part ***********/
// Connection URL
var authUrl = 'mongodb://1111hui.com:27017/admin';
var db = null;
var col = null;
var MONGO_AUTH = false;

if(MONGO_AUTH) {
	MongoClient.connect(authUrl, function(err, _db) {
	  assert.equal(null, err);
	  _db.authenticate('root', '820125', function(err, res){
	  	assert.equal(null, err);
	  	console.log("Connected to mongodb server");
		db = _db.db("test");
	  col = db.collection('qiniu_bucket01');
		// db.collection('test').find().toArray(function(err, items){ console.log(items); });
		//runCmd("phantomjs main.js");
	  });
	});
} else {
	MongoClient.connect('mongodb://localhost:27017/admin', function(err, _db) {
	  	assert.equal(null, err);

	  	console.log("Connected to mongodb server");
		db = _db.db("test");
	  	col = db.collection('qiniu_bucket01');

      updateCompanyTree();

	});
}

var insertDoc = function(data, callback) {
  assert.notEqual(null, db, "Mongodb not connected. ");
  var col = db.collection('test31');
  console.log(data);
}



var _DBSIGN = "_MONGODATA";

function _log () {
  for(var i=0; i<arguments.length; i++)
    if(arguments[i]) process.stdout.write(arguments[i].toString());
}
function _logErr () {
  for(var i=0; i<arguments.length; i++)
    if(arguments[i]) process.stderr.write(arguments[i]);
}


function genPDF ( filename, shareID,  realname, cb ) {

	var tempFile = IMAGE_UPFOLDER + (+new Date()+Math.random().toString().slice(2,5)+'_') +'.pdf';

	var wget = 'rm -r "'+ IMAGE_UPFOLDER+realname+ '"; wget --restrict-file-names=nocontrol -P "' + IMAGE_UPFOLDER + '" -O "'+ tempFile +'" -N "' + FILE_HOST+filename +'" ';
	console.log(wget);
	var child = exec(wget, function(err, stdout, stderr) {

		//console.log( err, stdout, stderr );
		if(err || (stdout+stderr).indexOf('200 OK')<0 ) return cb?cb('无法获取原始文件'):'';

		var tempPDF = IMAGE_UPFOLDER + (+new Date()+Math.random().toString().slice(2,5)+'_') +'.pdf';
		var cmd = 'phantomjs --config=client/config client/render.js "file='+ FILE_HOST+filename +'&shareID='+ shareID +'" '+ tempPDF;
		console.log(cmd);

		var child = exec(cmd, function(err, stdout, stderr) {

		if(err || stdout.toString().indexOf('render page:')<0 ) return cb?cb('生成绘图数据错误'):'';

    // pyPDF2 will not handle landscrape page of pdf, and rotate it strangely; using pdftk instead:
    // http://stackoverflow.com/questions/501723/overlay-one-pdf-or-ps-file-on-top-of-another
    // cmd = './mergepdf.py -i '+ tempFile +' -m '+tempPDF+' -o '+ IMAGE_UPFOLDER+realname +' ';
    cmd = 'pdftk "'+ tempPDF +'" multibackground "'+tempFile+'" output "'+ IMAGE_UPFOLDER+realname +'" ';
		console.log(cmd);
		exec(cmd, function (error, stdout, stderr) {
			//console.log(error,stdout, stderr);
			if(error){
				cb('合并PDF文件错误');
			}
			if(cb) cb(null);
		});
		});
	});
}

function genPDF2 ( infile, imagefile, page, outfile ) {

  exec('./mergepdf.py -i '+ infile +'.pdf -m '+imagefile+'.pdf -p '+page+' -o '+ outfile +'.pdf ', function (error, stdout, stderr) {
    console.log(error,stdout, stderr);
  });

  return;

  // pdftoppm -rx 150 -ry 150 -png file.pdf prefix
  // convert image.pdf -verbose -density 177.636  -quality 100 -sharpen 0x1.0 -background "rgba(0,0,0,0)" -transparent white image1x04.pdf
  exec('convert '+imagefile+'.pdf -density '+ scale +' -quality 100 -sharpen 0x1.0 -background "rgba(0,0,0,0)" -transparent white '+ imagefile +'1x.pdf', function (error, stdout, stderr) {
      console.log(stdout);
      exec('./mergepdf.py -i '+ infile +'.pdf -m '+imagefile+'1x.pdf -o '+ outfile +'.pdf ', function (error, stdout, stderr) {
        console.log(stdout);
      });
  });

}


function runCmd (cmd, dir, callback) {

  var args = cmd.split(" ");
  var command = args[0];

  args.shift();

  var proc = spawn(command,   ["--config", "config"].concat(args), {
    cwd: (dir?dir:__dirname),
    stdio: "pipe",
  });

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', function (data) {

      console.log(data);
      if( data && ( new RegExp ("^"+_DBSIGN) ).test(data) ) {
        var d = JSON.parse(data.split(_DBSIGN)[1]);
        if(d.type=="genPDF"){
          genPDF("font", d.image, d.scale, "out");
        }
      }else{
        //_log(data);
      }
  });

  proc.stderr.on('data', function (data) {
    _logErr(data);
  });

  proc.on('close', function (code) {
    if(db) db.close();
    console.log('app exited with code ' + code);
  });

  proc.on("error", function (e) {
    console.log(e);
    process.exit(1);
  });

}




////////
// wx part
/******/

var WX_COMPANY_ID = 'wx59d46493c123d365';
var config = {
  token: 'IEAT2qEzDCkT7Dj6JH',
  appid: 'lianrunent',
  encodingAESKey: 'olHrsEf4MaTpiFM1fpjbyvBJnmJNW3yFZBcSbnwYzrJ',
  corpId: WX_COMPANY_ID
};

var wechat = require('wechat-enterprise');
app.use('/wx',
wechat(config, wechat
.link(function (message, req, res, next) {
  console.log(message);
  return res.reply(message);
})
.location(function (message, req, res, next) {
//**** message format:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'yangjiming',
//   CreateTime: '1439364875',
//   MsgType: 'event',
//   Event: 'LOCATION',
//   Latitude: '30.069601',
//   Longitude: '120.488655',
//   Precision: '120.000000',
//   AgentID: '1' }

  console.log(message);
  return res.reply(message);
})
.video(function (message, req, res, next) {
  console.log(message);
  return res.reply(message);
})
.voice(function (message, req, res, next) {
//**** message format:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'yangjiming',
//   CreateTime: '1439363658',
//   MsgType: 'voice',
//   MediaId: '1TirVJnXpbd93ddYfVMop_9cYy538dCsnz4N07pgxdYLj5GPWtSHzthH40mF_7quJ1Jyrf22Lj9uWXsVZ64h01Q',
//   Format: 'amr',
//   MsgId: '4561277396023509015',
//   AgentID: '1',
//   Recognition: '' }

  console.log(message);
  return res.reply(message);
})
.event(function (message, req, res, next) {

//****when click MENU LINK, will receive message:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'ceshi1',
//   CreateTime: '1439428547',
//   MsgType: 'event',
//   AgentID: '1',
//   Event: 'view',
//   EventKey: 'http://hostname/tree.html' }

//****when enter Agent, will receive message:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'yangjiming',
//   CreateTime: '1439364874',
//   MsgType: 'event',
//   AgentID: '1',
//   Event: 'enter_agent',
//   EventKey: '' }


//**** when click event menu, message format:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'yangjiming',
//   CreateTime: '1439363611',
//   MsgType: 'event',
//   AgentID: '1',
//   Event: 'click',
//   EventKey: 'file_msg' }

	if(message.Event=='subscribe' || message.Event=='unsubscribe' ){
		console.log(message);
		updateCompanyTree();
	}

  return res.reply(message);
})
.image(function (message, req, res, next) {
//**** message format:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'yangjiming',
//   CreateTime: '1439363357',
//   MsgType: 'image',
//   PicUrl: 'http://mmbiz.qpic.cn/mmbiz/UF3WGRScRh8uhCJcIYcfsH5c5wV6H41lbvkIDzibLMBABZpHBChgfaFbwf2GxTyyUSmd2hy1icqzahicjybtWexoQ/0',
//   MsgId: '4561277396023509014',
//   MediaId: '1x5uMWjTL9tEjewN8IuJCJDPyQCQitHmwnhEzG6dw5q18q_AidkVivdVeNJ0C_eM7s_FWnVBFzYdvo10FOllFQQ',
//   AgentID: '1' }

  //console.log(message);


  var person = message.FromUserName;
  if (person==WX_COMPANY_ID) return;

  var userInfo = getUserInfo(person);
  if(message.MsgType=='image' && userInfo ) {

    var shareID;
    var condition = {role:'shareMsg', shareID:{$gt:0}, WXOnly:{$in: [null, false]} ,
             touser: new RegExp('^'+ person +'\\||\\|'+ person +'\\||\\|'+ person +'$') };

    col.findOne( condition , { sort: {date : -1}, limit:1, fields:{_id:0, fromUser:0} },
      function  (err, msg) {

        //console.log(condition, err, msg);
        if(err||!msg) return;
        if(!msg.shareID) return;

        shareID = msg.shareID;


        var req={query:{ mediaID: message.MediaId, person: person, shareID: shareID, isInMsg: true }};
        var res = { send:function(){} };
        uploadWXImage(req, res);

      });
  }



  return res.reply('');
})
.text(function (message, req, res, next) {
//**** message format:
// { ToUserName: 'wx59d46493c123d365',
//   FromUserName: 'yangjiming',
//   CreateTime: '1439363336',
//   MsgType: 'text',
//   Content: '好的',
//   MsgId: '4561277396023509013',
//   AgentID: '1' }


  // var msg = {
  //  "touser": 'yangjiming',
  //  "msgtype": "text",
  //  "text": {
  //    "content": util.format('%s发送了留言：%s', message.FromUserName, message.Content  )
  //  },
  //  "safe":"0",
  //   date : new Date()
  // };
  // api.send(msg.touser, msg, function  (err, result) {  });

  //console.log(message);

  var person = message.FromUserName;
  if (person==WX_COMPANY_ID) return;

  var userInfo = getUserInfo(person);
  if(message.MsgType=='text' && message.Content && userInfo ) {

    var re = /\s*@\d+\s*$|^\s*@\d+\s*/;
    var p = message.Content.match(re);
    var shareID = p? parseInt( p.pop().replace(/\s*@/,'') ) :'';
    var content = message.Content.replace(re, '');

    var condition = {role:'shareMsg', shareID:{$gt:0}, WXOnly:{$in: [null, false]} ,
             touser: new RegExp('^'+ person +'\\||\\|'+ person +'\\||\\|'+ person +'$') };

    if(shareID) condition.shareID = shareID;

    col.findOne( condition , { sort: {date : -1}, limit:1, fields:{_id:0, fromUser:0} },
      function  (err, msg) {

        //console.log(condition, err, msg);
        if(err||!msg) return;
        if(!msg.shareID) return;

        shareID = msg.shareID;

        if(0 && !shareID) {

        var sharePath = JSON.stringify(msg).replace(/<[^>]+>/g,'').match(/\/[^/]+\//);
        sharePath = sharePath? sharePath.pop() : '';

      var overAllPath = util.format('<a href="%s#path=%s&shareID=%d&openMessage=1">%s</a>', TREE_URL, encodeURIComponent(sharePath), msg.shareID, sharePath ) ;

          msg.MsgId = message.MsgId;

          msg.text.content =
            util.format('%s 对%s 留言：%s',
                  userInfo.name,
                  overAllPath,
                  content
                );

        sendWXMessage(msg, person );

      } else {

        var req = {body:{ person: person, shareID:shareID, text:content }};
        var res = { send:function(){} };

        SendShareMsg(req, res);

      }

      }  );

  }

  res.reply('');

  return;



  res.reply([
  {
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://1111hui.com:88/images/logo.png',
      url: 'http://nodeapi.cloudfoundry.com/'
    } ,
{
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://1111hui.com:88/images/logo.png',
      url: 'http://nodeapi.cloudfoundry.com/'
    } ,
{
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://1111hui.com:88/images/logo.png',
      url: 'http://nodeapi.cloudfoundry.com/'
    } ,
{
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://1111hui.com:88/images/logo.png',
      url: 'http://nodeapi.cloudfoundry.com/'
    } ,
{
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://1111hui.com:88/images/logo.png',
      url: 'http://nodeapi.cloudfoundry.com/'
    } ,
{
      title: '你来我家接我吧',
      description: '这是女神与高富帅之间的对话',
      picurl: 'http://1111hui.com:88/images/logo.png',
      url: 'http://nodeapi.cloudfoundry.com/'
    } ,

    ]);
})
.location(function (message, req, res, next) {
  console.log(message);
  res.reply("location");
})
));



// Enterprise Push Message part

var CompanyName = 'lianrun';
var API = require('wechat-enterprise-api');

var api2 = new API("wx59d46493c123d365", "5dyRsI3Wa5gS2PIOTIhJ6jISHwkN68cryFJdW_c9jWDiOn2D7XkDRYUgHUy1w3Hd", 0, function (callback) {

  var rkey = 'wx:js:accessToken2';
  redisClient.get( rkey, function (err, txt) {
    if (err) {return callback(err);}
    callback(null, JSON.parse(txt));
  });

}, function (token, callback) {

  var rkey = 'wx:js:accessToken2';
  redisClient.set( rkey, JSON.stringify(token), 'ex', 7200, callback);

});

api2.setOpts({timeout: 60000});



var api = new API("wx59d46493c123d365", "5dyRsI3Wa5gS2PIOTIhJ6jISHwkN68cryFJdW_c9jWDiOn2D7XkDRYUgHUy1w3Hd", 1, function (callback) {
  // 传入一个获取全局token的方法

  var rkey = 'wx:js:accessToken';
  redisClient.get( rkey, function (err, txt) {
    if (err) {return callback(err);}
    callback(null, JSON.parse(txt));
  });

}, function (token, callback) {
  // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
  // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
  // fs.writeFile('access_token.txt', JSON.stringify(token), callback);

  var rkey = 'wx:js:accessToken';
  redisClient.set( rkey, JSON.stringify(token), 'ex', 7200, callback);

});

api.setOpts({timeout: 60000});


// get accessToken for first time to cache it.
api.getLatestToken(function () {});

var COMPANY_TREE = null
var STUFF_LIST = null;



// combine Stuff Data from WX CompanyTree and Custom Stuff Data
function combineStuffData(doc){
  var stuff2 = doc.stuffList;
  var emptyStuff = [];

  COMPANY_TREE.forEach(function(v, i){

    var isFound = stuff2.some(function(s) {
      if(s.userid==v.userid) {
        COMPANY_TREE[i] = _.extend(v, s);
        return true;
      }
    });

    if(!isFound && v.userid) {
      emptyStuff.push( {
        userid: v.userid,
        client:'',
        ip:'',
        level:'',
        userRole:[],
        shortPhone:''
      } );
    }

  });
  col.updateOne( {role:'stuff'}, {$push:{ stuffList: {$each:emptyStuff} }} );
}


function updateCompanyTree () {
  var companyTree = [];
  var stuffList = [];
  api.getDepartments(function  (err, result) {
    if(err) console.log(err);
    var i=0;
    var departs = result.department;

    departs.forEach(function  (v) {
      api.getDepartmentUsersDetail(1, 1, 0, function  (err, users) {
        i++;
        //v.children = users.userlist;
        v.pId = v.parentid;
        companyTree.push(v);

        users.userlist.forEach(function(s){
          if( s.department.indexOf(v.id)==-1) return true;
          var namedDep = s.department.map(function  (depID) {
            return _.where(departs, { id: depID} )[0].name;
          });

          s.pId = s.department[0];
          s.departmentNames = namedDep;
          s.depart = namedDep?namedDep[0]:'';
          companyTree.push(s);
          if( ! _.where(stuffList, {userid:s.userid }).length ) stuffList.push(s);

        });
        if(i==departs.length){

            col.findOneAndDelete({ company:CompanyName, role:"companyTree" }, function  (err, result) {
                col.update(
                { company:CompanyName, role:"companyTree" }, { company:CompanyName, role:"companyTree", date: new Date(), companyTree:companyTree, stuffList:stuffList  } ,
                {upsert:true, w: 1},
                function(err, result) {

                  if(err) return console.log('updateCompanyTree', err);

                  COMPANY_TREE = companyTree;
                  STUFF_LIST = stuffList;

                  // update COMPANY_TREE with extended info from db
                  col.findOne({role:'stuff'}, {sort: {level:-1} }, function(err, doc){

                    combineStuffData(doc);

                  });

                  console.log('update companyTree: ', result.result.nModified);
                  // col.update( { company:CompanyName, role:"companyTree", 'companyTree.id':1 }, { '$addToSet': {  'companyTree.$.children': {"userid":"yangjiming","name":"董月霞","department":[1],"mobile":"18072266386","gender":"1","email":"hxsdyjm@qq.com","weixinid":"futurist6","avatar":"http://shp.qpic.cn/bizmp/guTsUowz0NPtOuBoHUiaw3lPyys0DWwTwdUsibvlmwyzdrmYdxwRU4ag/","status":1} } } );

              });
            });



        }
      });
    });
  });
}


app.post("/getStuffList", function (req, res) {
  col.findOne({role:'stuff'}, function(err, ret){
    res.send(ret.stuffList);
  } );
});

app.post("/updateOneStuff", function (req, res) {
  var data = req.body;
  col.updateOne({role:'stuff', 'stuffList.userid':data.userid}, {$set:{'stuffList.$': data}}, function(err, ret){
    if(err||ret.result.nModified==0) return res.end();
    res.send('OK');
  } );
});


app.get("/updateCompanyTree", function (req, res) {
  updateCompanyTree();
  res.send('OK');
});


app.post("/getCompanyTree", function (req, res) {
  var data = req.body;
  var company = data.company;
  if(COMPANY_TREE){

    res.send( JSON.stringify( COMPANY_TREE ) );

  } else {

    col.find( { company: company, role:"companyTree" } , {limit:2000, sort:{ pId:-1, parentid:-1 } } ).toArray(function(err, docs){
        if(err|| !docs || !docs.length) return res.send('');
        var count = docs.length;
        if(count)

        COMPANY_TREE = docs[0].companyTree;
        STUFF_LIST = docs[0].stuffList;

        // update COMPANY_TREE with extended info from db
        col.findOne({role:'stuff'}, {sort: {level:-1} }, function(err, doc){

          combineStuffData(doc);
          res.send( JSON.stringify( COMPANY_TREE ) );


        });

    });

  }

});

app.get("/createDepartment", function (req, res) {
  var name=req.query.name;
  var pid=req.query.pid;
  api.createDepartment(name, {parentid:pid}, function(err, result){
    console.log(err, result);
    return res.send('OK');
  } );
});





app.post("/getCommonFunc", function (req, res) {
  var data = req.body;
  var company = data.company;
  col.findOne( { company: company, role:'commonFunc' } , {limit:1}, function(err, doc){
      if(err|| !doc) return res.send('');
      res.send( doc );
  });
});

app.post("/getPrintList", function (req, res) {
  var data = req.body;
  var company = data.company;
  col.findOne( { company: company, role:'printer' } , {limit:1}, function(err, doc){
      if(err|| !doc) return res.send('');
      res.send( doc );
  });
});












app.use( express.static(path.join(__dirname, 'client'), { index:false, }) );
