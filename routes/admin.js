var express = require('express');
var router = express.Router();
var pg = require('pg');
const {isValid,config,deleteMeeting} = require('./config');
var pool = new pg.Pool(config);
var io = null;

let foo={
  defineSocketsAndGetHosts:function (req, res, next){
    if(!io){
      io = require('socket.io')(req.socket.server, {allowEIO3: true});
      io.sockets.on('connection', function(client){
        client.on('delete-event', function(data){
          deleteMeeting(data.eventId,pool);
          io.emit('delete-eventResponse', {eventId:data.eventId});
        });
      });
    }

    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT id,username FROM host;`, [],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.hosts = result.rows;
            next();
          }
        });
      }
    });
  },
  getRatings:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT rate,count(rate) AS broj FROM rating GROUP BY rate ORDER BY rate`, [],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            let lista = [];
            if(result.rows.length===5){
              lista = result.rows;
            }else{
              let t=[];
              for(let i=0;i<result.rows.length;i++){
                t.push(result.rows[i].rate);
              }
              let b=0;
              for(let i=0; i<5;i++){
                if(t.includes(i+1)){
                  lista.push(result.rows[b]);
                  b++;
                }else{
                  lista.push({rate:i+1,broj:'0'});
                }
              }
            }
            req.rating = lista;
            next();
          }
        });
      }
    });
  },
  getForbiddenAndRender:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT * FROM forbidden;`, [],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.forbidden = result.rows;
            res.render('admin', {hosts:req.hosts, forbidden:req.forbidden, ime:req.session.user.username,j:req.rating[0],d:req.rating[1],t:req.rating[2],c:req.rating[3],p:req.rating[4]});
          }
        });
      }
    });
  },
  getEventsForAdmin:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT kod AS id,name FROM event WHERE host_id=$1;`, [req.body.hostId],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.events = result.rows;
            res.render('admin-ev', { events:req.events}, function(err, html) {
              if(err){
                return next(err);
              }
              res.send(html);
            });
          }
        });
      }
    });
  },
  deleteHost:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT kod FROM event WHERE host_id=$1;`,[req.body.hostId],function (err, result1){
          if(err){
            return next(err);
          }else{
            for(let i=0;i<result1.rows.length;i++){
              deleteMeeting(result1.rows[i].kod,pool);
            }
            client.query(`DELETE FROM host WHERE id = $1;`,[req.body.hostId],function (err, result){
              done();
              if(err){
                return next(err);
              }else{
                res.status(200).send({hostId:req.body.hostId});
              }
            });
          }
        });
      }
    });
  },
  addForbiddenWord:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`INSERT INTO forbidden VALUES ($1)`,[req.body.word],function (err, result1){
          done();
          if(err){
            return next(err);
          }else{
            res.status(200).send({word:req.body.word});
          }
        });
      }
    });
  },
  deleteForbiddenWord:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`DELETE FROM forbidden WHERE word=$1;`,[req.body.word],function (err, result1){
          done();
          if(err){
            return next(err);
          }else{
            res.status(200).send({success:true});
          }
        });
      }
    });
  },
  blockHost:function (req, res, next){
    let interval = req.body.block;
    interval = parseInt(interval);
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`UPDATE host SET block_time=current_date + $1::integer WHERE id = $2;`,[interval,req.body.hostId],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            res.status(200).send({success:true});
          }
        });
      }
    });
  }
}

router.get('/', isValid,foo.defineSocketsAndGetHosts,foo.getRatings,foo.getForbiddenAndRender);

router.post('/events', foo.getEventsForAdmin);

router.post('/delete-host', foo.deleteHost);

router.post('/add-word',foo.addForbiddenWord);

router.post('/delete-word',foo.deleteForbiddenWord);

router.post('/block-host',foo.blockHost);

module.exports = router;
