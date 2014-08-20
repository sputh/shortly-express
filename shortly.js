var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session')


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var bcrypt = require('bcrypt-nodejs');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Cookie & Session
app.use(cookieParser());
app.use(session({secret: '123Secret', cookie: {maxAge: 60000}}));

var checkUser = function(req, res, next) {
  console.log("inside of checkUser",req.session.userID);
  if(!req.session.userID) {
    res.render('login');
  } else{
    next();
  }
};

app.get('/', checkUser, function(req, res){
  res.render('index');
});

app.get('/create', checkUser, function(req, res){
  res.render('index');
});

app.get('/login', checkUser, function(req, res){
  res.render('index');
});

app.get('/links', checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

// User Authentication --Sign up
app.post('/signup', function(req,res) {
  console.log('received /signup');
  var username = req.body.username;
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  // if(username.length<8 || password.length<8){
  //   console.log('error, username/pass length too short');
  // }
  new User({username: username}).fetch().then(function(found){
    if(found){
      // alert('Username is already taken');
    }
    var user = new User({
      username: username,
      password: password,
    });
    user.save().then(function(){
      console.log('user', user.id);
      req.session.userID = user.id;
      res.redirect(302,'/');
    });
  });
});

app.post('/login', function(req,res) {
  console.log('received /logged in');
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(found){
    if(found){
      // Check if password is the same as hashed
      //  if it is the same
      //    redirect to /create
      //  else -- login page again
      var realPass = found.attributes.password;
      if(bcrypt.compareSync(password,realPass)){
        // req.session.lastpage = '/index';
        req.session.userID = found.attributes.id;
        res.redirect(302,'/create');
      } else {
        res.redirect(302,'/login');
      }
    } else {
      res.redirect(302,'/login');
    }

  });
});

app.post('/links',
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }
  //select query for any model with url=uri
  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      console.log('inside found');
      res.json(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
        .where('code', '=', link.get('code'))
        .update({
          visits: link.get('visits') + 1,
        }).then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
