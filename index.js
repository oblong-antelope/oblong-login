var express = require('express');
var jwt = require('jwt-simple');
var captchapng = require('captchapng');
var sha2 = require('js-sha256').sha256;
var redis_client = require('redis').createClient(process.env.REDIS_URL);
var HTTPRequest = require('request');
var app = express();

var PORT = process.env.PORT || 1140;

var bodyParser = require('body-parser');


//INITIAL DB SETUP
//redis_client.flushdb(function(err, succ){
//    console.log(succ);
//});

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


//REMEMBER TO COPY PASTE THIS app.options block into relentless and onslaught
app.options("/*", function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.send(200);
});

app.post('/api/login', function(request, result){
    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');
    result.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    console.log('request login for e:' + request.body.email + ' p:' + request.body.password);
    var key = request.body.email + ':::' + request.body.password;

    console.log(sha2(key));

    redis_client.get('USER' + sha2(key), function(err, reply){
        console.log('aaaaaareply' + reply);
        if(reply!=null && reply!=={}){
            console.log('success!');
            var dataFromRequest = {email:request.body.email, password:request.body.password};
            var token = jwt.encode(dataFromRequest, secret);
            var rep = JSON.parse(reply);
            result.end(JSON.stringify({
                success: true,
                jwt: token,
                tokendata: rep
            }));

            redis_client.set('TOKE' + token, reply, function(err, succ){
                if(err!=null) {
                    console.log('TOKEN ' + token + ' created,\n\t\tREASON: logged in successfully.');
                }
            });
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
    redis_client.del('TOKE' + request.body.jwt, function(err, succ){
        console.log('TOKEN ' + request.body.jwt + ' invalidated,\n\t\tREASON: logged out successfully.');
        if(err==null){
            result.end(JSON.stringify({
                success: true
            }));
        }else{
            result.end(JSON.stringify({
                success: false
            }));
        }
    });
});

//do a lookup on http://oblong-adventures.herokuapp.com/api/people/find?title=Mr&firstname=JOHN&lastname=smith&email=xxx
//to find the person then associate it at new user creation time
var PEOPLE_ADDR = 'http://battle.horse/oblong/api/people/find?';
app.post('/api/newuser', function(request, result){
    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');
    result.writeHead(200, {
        'Content-Type': 'text/plain'
    });


    var userUniqueKey = sha2(request.body.email + ':::' + request.body.password);


    //get the user id
    HTTPRequest(PEOPLE_ADDR + 'firstname=' + request.body.firstname
                            + '&lastname=' + request.body.lastname
                            , function (error, res, body) {

        console.log(body);
        var id_components = body.split('/');

        if(id_components.length>=6){
            console.log('Error - More than 1 person match the firstname and lastname in the database');
        }

        var final_section = id_components[4];

        redis_client.set('USER' + userUniqueKey,
            JSON.stringify({
                title:request.body.title,
                firstname:request.body.firstname,
                lastname:request.body.lastname,
                userid:id_components[4].substring(0, final_section.length-2)
            }), function(err, succ){
                if(err==null){
                    console.log('Created user successfully e:' + request.body.email + ' p:' + request.body.password);
                    console.log('new user sha is ' + userUniqueKey);
                    console.log('\n\t\tREASON: user created successfully');
                    result.end(JSON.stringify({
                        success: true
                    }));
                }else{
                    result.end(JSON.stringify({
                        success: false
                    }));
                }
        });
    });

});

app.post('/api/tokendata', function(request, result){
    result.header('Access-Control-Allow-Origin', '*');
    result.header('Access-Control-Allow-Methods', 'POST');

    redis_client.get('TOKE' + request.body.jwt, function(err, reply){
        if(reply!=null) {
            console.log('Token data accessed.' + request.body.jwt + '\n\t\tREASON: user access success');
            result.writeHead(200, {'Content-Type': 'text/plain'});
            result.end(reply);
        }else{
            result.writeHead(204, {'Content-Type': 'text/plain'});
            result.end("TOKEN DOES NOT EXIST");
        }
    });
});


var server = app.listen(PORT, function(){
    var host = server.address().address;
    var port = server.address().port;

    console.log('Started Server at %s:%s', host, port);
});