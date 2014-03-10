var flash = require('express-flash');
var express = require('express');
var app = express();
var config = require('./config.json');
var router = require('./routes');
var path = require('path');

app.use(express.bodyParser());
app.use(express.cookieParser('keyboard cat'));
app.use(express.session({ cookie: { maxAge: 60000 }}));
app.use(flash());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.configure('development', function(){
    app.locals.pretty = true;
});
app.use(express.static(path.join(__dirname, 'public')));

app.use(app.router);
router(app);

var port = require('url').parse(config.baseUrl).port;
var server = app.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});
