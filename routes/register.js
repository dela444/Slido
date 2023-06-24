var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var pg = require('pg');
var config = require('./config').config;
var pool = new pg.Pool(config);

let foo={
  createHost:function(req, res, next) {
    bcrypt.hash(req.body.pass,10,function (err,hash){
      pool.connect(function (err,client,done){
        if(err){
          return next(err);
        }else{
          client.query(`INSERT INTO host(username,password,block_time) VALUES($1,$2,to_date('2022-12-25', 'YYYY-MM-DD'));`,[req.body.user,hash],function (err,result){
            done();
            if(err){
              return next(err);
            }else{
              next();
            }
          });
        }
      });
    });
  },
  makeHimSession:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT * FROM HOST WHERE id = (SELECT max(id) FROM host);`,[],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.session.regenerate(function (err) {
              if (err) {
                return next(err);
              }else{
                req.session.user = result.rows[0];
                req.session.host = true;
                req.session.save(function (err) {
                  if (err) {
                    return next(err);
                  }else{
                    res.redirect('http://localhost:3000/host');
                  }
                });
              }
            });
          }
        });
      }
    });
  },
  checkUsername: function (req,res,next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT * FROM host WHERE username=$1;`,[req.body.username],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            if(result.rows.length===0){
              res.status(200).send({success:true});
            }else{
              res.status(200).send({success:false});
            }
          }
        });
      }
    });
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('register', { title: 'Slido' });
});

router.post('/',foo.createHost,foo.makeHimSession);

router.post('/check-username',foo.checkUsername);

module.exports = router;