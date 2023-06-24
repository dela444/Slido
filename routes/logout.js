var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  req.session.user = null;
  req.session.save(function (err) {
    if (err){
      return next(err);
    }else{
      req.session.regenerate(function (err) {
        if (err) {
          return next(err);
        }else{
          res.redirect('http://localhost:3000');
        }
      });
    }
  });
});

module.exports = router;
