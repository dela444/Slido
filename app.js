var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var registerRouter = require('./routes/register');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var hostRouter = require('./routes/host');
var eventRouter = require('./routes/event');
var adminRouter = require('./routes/admin');
var meetRouter = require('./routes/meet');
var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var pg = require('pg');
var session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

var config = require('./routes/config').config;
var pool = new pg.Pool(config);

const store = new pgSession({
  pool: pool,
  tableName: 'session',
});

app.use(session({
  store: store,
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
}));


app.use('/', indexRouter);
app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/host', hostRouter);
app.use('/event', eventRouter);
app.use('/admin', adminRouter);
app.use('/meet', meetRouter);
app.all('*', function (req, res) {
  res.redirect('http://localhost:3000/');
});
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
