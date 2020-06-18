var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var session = require("express-session");
var okta = require("@okta/okta-sdk-nodejs");
var ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;

var publicRouter = require('./routes/public');
var dashboardRouter = require('./routes/dashboard');
var healthRouter = require('./routes/health');
var usersRouter = require("./routes/users");

var app = express();
var cors = require('cors');
app.use(cors());

let OktaDomain = 'dev-574737.okta.com'
var oktaClient = new okta.Client({
  orgUrl: `https://${OktaDomain}`,
  token: '00reqknkEQw4qsimR1cJQyxNp6KRjfxJp4HiqAQIkV'
});

const oidc = new ExpressOIDC({
  issuer: `https://dev-574737.okta.com/oauth2/default`,
  client_id: '0oafboqflzbb4J2z04x6',
  client_secret: 'vtoLPdiFJVb7OoGjYluuvOcHOt2eFYoJ3jbkAgrA',
  appBaseUrl: 'http://localhost:3000',
  scope: "openid profile",
  routes: {
    login: {
      path: "/users/login"
    },
    loginCallback: {
      path: "/users/callback",
      afterCallback: "/dashboard"
    }
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'dsljfdsj4f34f34fff',
  resave: true,
  saveUninitialized: false
}));
app.use(oidc.router);

app.use((req, res, next) => {
  if (!req.userContext) {  // checks to see if there is a currently logged in user or not by looking at the req.userinfo object
    return next();
  }
    req.userinfo = req.userContext.userinfo
  oktaClient.getUser(req.userContext.userinfo.sub)
    .then(user => {
      req.userdetail = user;  //gets user from okta api and creates 2 objs which point to the user object directly
      res.locals.userdetail = user;
      next();
    }).catch(err => {
      next(err);
    });

});


// app.get('/test', (req, res) => {
//   res.json({ profile: req.userContext ? profile : null });
// });


app.use('/', publicRouter);
app.use('/dashboard', oidc.ensureAuthenticated(), dashboardRouter);//Express.js will first run our loginRequired middleware BEFORE the dashboardRouter is processed
app.use('/users', usersRouter);
app.use('/health', oidc.ensureAuthenticated(), healthRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
