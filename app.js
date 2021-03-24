const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const logger = require('morgan');


const blockListener = require('./blockListener');


const app = express();

let data = [];
const blockHandler = ((r) => {
  data = r;
})


blockListener(blockHandler)
// view engine setup
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.options('*', cors()) // include before other routes

app.use(cors({
  origin: true,
}));

app.use('/pools', function(req, res) {
  res.json(data);
});

// error handler
app.use(function(err, req, res, next) {
  console.log(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(err);
});


module.exports = app;
