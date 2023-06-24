var express = require('express');
var router = express.Router();
var pg = require('pg');
const {isValid,config} = require('./config');
var pool = new pg.Pool(config);
//var io = null;

let foo={
  setIoAndGetQuestions:function(req, res, next){
    let k = req.params.c;
    sobe.push({room: k});
    if(!io){
      io = require('socket.io')(req.socket.server, {allowEIO3: true});
      io.sockets.on('connection', function(client) {

        client.join(sobe[sobe.length-1].room);
        sobe[sobe.length-1].id = client.id;
        client.on('end-event',function (data){
          let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
          let soba = sobe[indeks].room;
          io.to(soba).emit('end-eventResponse',{ev:data.ev});
        });

        client.on('like', function (data) {
          let liked = data.liked;
          let questionId = data.questionId;
          let likes = parseInt(data.likes);
          if (!liked) {
            likes += 1;
            liked = true;
          } else {
            likes -= 1;
            liked = false;
          }
          pool.connect(function (err, clien, done) {
            if (err) {
              return next(err);
            } else {
              clien.query(`UPDATE questions SET likes=$1 WHERE id=$2;`, [likes, questionId], function (err, result) {
                done();
                if (err) {
                  return next(err);
                } else {
                  if(liked){
                    liked = 'true';
                  }else{
                    liked = 'false';
                  }
                  let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
                  let soba = sobe[indeks].room;
                  io.to(soba).emit('likeResponse', {liked: liked, likes: likes, questionId: JSON.stringify(questionId)});
                }
              });
            }
          });
        });
        client.on('ask', function (data) {
          let asked = data.asked.split(' '), status = true, c = 0;
          pool.connect(function (err, clien, done) {
            if (err) {
              return next(err);
            } else {
              clien.query(`SELECT * FROM forbidden;`, [], function (err, result1) {
                if (err) {
                  return next(err);
                } else {
                  let lista = [];
                  for (let i = 0; i < result1.rows.length; i++) {
                    lista.push(result1.rows[i].word);
                  }
                  for (const word of asked) {
                    if (lista.includes(word)) {
                      status = false;
                    }
                  }
                  if (status) {
                    status = 1;
                  } else {
                    status = 3;
                  }
                  clien.query(`SELECT max(id) AS broj FROM questions;`, [], function (err, result2) {
                    if (err) {
                      return next(err);
                    } else {
                      c = result2.rows[0].broj + 1;
                      clien.query(`INSERT INTO questions(event_id,tekst,status) VALUES ($1,$2,$3);`, [data.eventId, data.asked, status], function (err, result) {
                        done();
                        if (err) {
                          return next(err);
                        } else {

                          if (status === 1) {
                            let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
                            let soba = sobe[indeks].room;
                            io.to(soba).emit('askResponse', {asked: data.asked, success: true, c: c, ev: data.eventId});
                          } else {
                            let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
                            let soba = sobe[indeks].room;
                            io.to(soba).emit('askResponse', {success: false, asked: data.asked});
                          }
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        });
        client.on('delete', function (data) {
          pool.connect(function (err, clien, done) {
            if (err) {
              return next(err);
            } else {
              clien.query(`DELETE FROM questions WHERE id=$1;`, [data.questionId], function (err, result) {
                done();
                if (err) {
                  return next(err);
                } else {
                  let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
                  let soba = sobe[indeks].room;
                  io.to(soba).emit('deleteResponse', {success: true, questionId: data.questionId});
                }
              });
            }
          });
        });
        client.on('answer', function (data) {
          let answer = data.answer, questionId = data.questionId;
          pool.connect(function (err, clien, done) {
            if (err) {
              return next(err);
            } else {
              clien.query(`UPDATE questions SET answer = $1,status=2 WHERE id=$2;`, [answer, questionId], function (err, result) {
                done();
                if (err) {
                  return next(err);
                } else {
                  let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
                  let soba = sobe[indeks].room;
                  io.to(soba).emit('answerResponse', {success: true, questionId: questionId, answer: answer,question:data.question});
                }
              });
            }
          });
        });
        client.on('hide', function (data) {
          let questionId = data.questionId;
          pool.connect(function (err, clien, done) {
            if (err) {
              return next(err);
            } else {
              clien.query(`UPDATE questions SET status = 3 WHERE id=$1;`, [questionId], function (err, result) {
                done();
                if (err) {
                  return next(err);
                } else {
                  let indeks = sobe.findIndex((sobe)=>sobe.id===client.id);
                  let soba = sobe[indeks].room;
                  io.to(soba).emit('hideResponse', {success: true, questionId: questionId});
                }
              });
            }
          });
        });
      });
    }
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT tekst,likes,id,answer FROM questions WHERE event_id=$1 AND status IN(1,2) ORDER BY id DESC;`, [req.params.c],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.questions = result.rows;
            next();
          }
        });
      }
    });
  },
  getHiddenQuestions:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT tekst,answer,id FROM questions WHERE event_id=$1 AND status=3;`,[req.params.c],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.hidden = result.rows;
            next();
          }
        });
      }
    });
  },
  getCountsAndRender:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT (SELECT count(*) FROM questions WHERE event_id=$1 AND status=2) AS broj_odg,
        (SELECT count(*) FROM questions WHERE event_id=$1 AND status=1) AS broj_nodg,slika FROM event WHERE kod=$1;`,[req.params.c],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.overall = result.rows;
            res.render('event',{questions:req.questions,overall:req.overall,hidden:req.hidden,ime:req.session.user.username,ev:req.params.c,h:req.session.host});
          }
        });
      }
    });
  }
}

router.get('/:c',isValid,foo.setIoAndGetQuestions,foo.getHiddenQuestions,foo.getCountsAndRender);

module.exports = router;