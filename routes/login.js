var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var pg = require('pg');
var config = require('./config').config;
var pool = new pg.Pool(config);

let foo={
  checkIsAdmin:function (req, res, next){
    pool.connect(function (err, client, done) {
      if (err) {
        return next(err);
      } else {
        client.query(`SELECT * FROM admin WHERE username = $1;`, [req.body.user], function (err, result) {
          done();
          if (err) {
            return next(err);
          } else {
            if(result.rows.length===0){
              next();
            }
            for (let i = 0; i < result.rows.length; i++) {
              let user = result.rows[i];
              bcrypt.compare(req.body.pass, result.rows[i].password, function (err, r) {
                if (err){
                  return next(err);
                }else {
                  if (r) {
                    req.session.regenerate(function (err) {
                      if (err) {
                        return next(err);
                      }else{
                        req.session.user = user;
                        req.session.host = false;
                        req.session.save(function (err) {
                          if (err) {
                            return next(err);
                          }else{
                            return res.status(200).send({success:true,h:false});
                          }
                        });
                      }
                    });
                  }else if(i === result.rows.length - 1){
                    next();
                  }
                }
              });
            }
          }
        });
      }
    });
  },
  checkIsHost:function(req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return next(err);
      } else {
        client.query(`SELECT * FROM host WHERE username = $1;`, [req.body.user], function (err, result) {
          done();
          if (err) {
            return next(err);
          } else {
            if(result.rows.length===0){
              return  res.status(200).send({success:false,h:true});
            }
            for (let i = 0; i < result.rows.length; i++) {
              let today = new Date();
              if(result.rows[i].block_time>today){
                return res.status(200).send({success:false,h:true});
              }
              let user = result.rows[i];
              bcrypt.compare(req.body.pass, result.rows[i].password, function (err, r) {
                if (err){
                  return next(err);
                }else {
                  if (r) {
                    req.session.regenerate(function (err) {
                      if (err) {
                        return next(err);
                      }else{
                        req.session.user = user;
                        req.session.host = true;
                        req.session.save(function (err) {
                          if (err) {
                            return next(err);
                          }else{
                            return res.status(200).send({success:true,h:true});
                          }
                        });
                      }
                    });
                  }else if(i === result.rows.length - 1){
                    return res.status(200).send({success:false,h:true});
                  }
                }
              });
            }
          }
        });
      }
    });
  }
}


router.get('/', function(req, res, next) {
  res.render('login', { title: 'Slido' });
});

router.post('/',foo.checkIsAdmin,foo.checkIsHost);

module.exports = router;
