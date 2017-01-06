var express = require('express');
var jwt = require('jwt-simple');
var captchapng = require('captchapng');
var sha2 = require('js-sha256').sha256;
var redis_client = require('redis').createClient(process.env.REDIS_URL);
var app = express();

var PORT = process.env.PORT || 1140;

var bodyParser = require('body-parser');


//INITIAL DB SETUP
redis_client.flushdb(function(err, succ){
    console.log(succ);
});

redis_client.set(sha2('e.williamson@ic.ac.uk' + ':::' + 'bubbles123'),
    JSON.stringify({
        title:'Miss',
        firstname:'Emily',
        lastname:'Williamson'
    }), function(err, succ){
    console.log(succ);
});

//END OF INITIAL DB SETUP



var payload = { email: 'abc@def.ghi', password: 'ilovethemonkeyhead' };
var secret = 'xxx';

//var token = jwt.encode(payload, secret);

//var decoded = jwt.decode(token, secret);



app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());
////////////////////////////////////////////////////


app.options("/*", function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.send(200);
});


app.get('/', function(request, result){
});

app.post('/api/login', function(request, result){
    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');
    result.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    var key = request.body.email + ':::' + request.body.password;

    console.log(sha2(key));

    redis_client.get(sha2(key), function(err, reply){
        console.log('aaaaaareply' + reply);
        if(reply!=null && reply!=={}){
            console.log('success!');
            var dataFromRequest = {email:request.body.email, password:request.body.password};
            var token = jwt.encode(dataFromRequest, secret);
            result.end(JSON.stringify({
                success: true,
                jwt: token,
                userid: '33'
            }));
        }else{
            console.log('fail!');
            result.end(JSON.stringify({
                success: false
            }));
        }
    });
});

app.post('/api/logout', function(request, result){
    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');
    result.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    result.end(JSON.stringify({
        success: true
    }));
});

app.post('/api/newuser', function(request, result){
    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');
    result.writeHead(200, {
        'Content-Type': 'text/plain'
    });


    var userUniqueKey = sha2(request.body.email + ':::' + request.body.password);

    redis_client.set(userUniqueKey,
        JSON.stringify({
            title:request.body.title,
            firstname:request.body.firstname,
            lastname:request.body.lastname
        }), function(err, succ){
            console.log('set user successfully ' + request.body.email + ' ' + request.body.password);
            console.log('new user sha is ' + userUniqueKey)
    });

    result.end(JSON.stringify({
        success: true
    }));
});

app.post('/captcha/', function(request, result){
    console.log('POST received');

    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');

    var d = new Date();

    if(request.body.request === 'captcha') {
        var hash = d.getTime().toString().substring(0,7);
        var cypherkey = sha2(hash);
        var captcha = parseInt(cypherkey.substring(0, 5), 16);
        var p = new captchapng(240, 90, captcha);
        p.color(0, 0, 0, 0);
        p.color(80, 80, 80, 255);

        var img = p.getBase64();
        var imgbase64 = new Buffer(img,'base64');
        result.writeHead(200, {
            'Content-Type': 'image/png'
        });
        result.end(imgbase64.toString('base64'));
    }else if(request.body.request === 'verify'){
        /*{
         request: 'verify',
         attempt: $('#iconCaptcha').val(),
         fullname: $('#iconFullName').val(),
         alias: $('#iconAlias').val(),
         pass: $('#iconPassword').val(),
         retypepass: $('#iconRetypePassword').val()
         }*/
        var oldHash = (d.getTime()-1000000).toString().substring(0,7);
        var oldCypherkey = sha2(oldHash);
        var oldCaptcha = parseInt(oldCypherkey.substring(0, 5), 16);
        var newHash = d.getTime().toString().substring(0,7);
        var newCypherkey = sha2(newHash);
        var newCaptcha = parseInt(newCypherkey.substring(0, 5), 16);
        if((request.body.attempt === newCaptcha.toString() ||
            request.body.attempt === oldCaptcha.toString()) &&
            request.body.pass === request.body.retypepass &&
            request.body.pass !== '' &&
            request.body.alias !== '' &&
            request.body.fullname !== ''){
            result.send(JSON.stringify({
                status:'success'
            }));
            console.log('user details + captcha = success');

            var key = request.body.alias + sha2(request.body.pass);
            var value = request.body.fullname + d.getTime();
            redis_client.set(key, value, function(err, succ){
                console.log(succ);
            });

        }else{
            result.send(JSON.stringify({
                status:'failure'
            }));
            console.log('user details + captcha = failure');
        }
    }
});


var server = app.listen(PORT, function(){
    var host = server.address().address;
    var port = server.address().port;

    console.log('Started Server at %s:%s', host, port);
});