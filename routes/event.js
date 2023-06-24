var express = require('express');
var router = express.Router();
var pg = require('pg');
const {config,checkTime,sendEmail} = require('./config');
var pool = new pg.Pool(config);
var nodemailer = require('nodemailer');

global.io = null;
global.sobe = [];

let foo ={
  eventStatus:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else {
        client.query(`SELECT name,status FROM event WHERE kod=$1;`, [req.body.ev], function (err, result) {
          done();
          if (err) {
            return next(err);
          } else {
            if(result.rows[0].status){
              res.status(200).send({success:true,ev:req.body.ev,name:result.rows[0].name});
            }else{
              res.status(200).send({success:false});
            }
          }
        });
      }
    });
  },
  getCounts:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT (SELECT count(*) FROM questions WHERE event_id=$1 AND status=2) AS broj_odg,
        (SELECT count(*) FROM questions WHERE event_id=$1 AND status=1) AS broj_nodg,vrijeme FROM event WHERE kod=$1;`,[req.params.c],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            req.bodg = result.rows[0].broj_odg;
            req.bnodg = result.rows[0].broj_nodg;
            req.pocetno = result.rows[0].vrijeme;
            next();
          }
        });
      }
    });
  },
  getQuestions:function(req,res,next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT tekst,likes,answer FROM questions WHERE event_id=$1 AND status IN(1,2)`,[req.params.c],function (err, result){
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
  getRatingAndSendMail:function (req,res,next){
    setTimeout(function (){
      pool.connect(function (err, client, done){
        if(err){
          return next(err);
        }else{
          client.query(`SELECT rate,count(rate) AS broj FROM rating WHERE event_id=$1 GROUP BY rate;`,[req.params.c],function (err, result){
            done();
            if(err){
              return next(err);
            }else{
              req.rating = result.rows;
              res.render('for-report',{odg:req.bodg,nodg:req.bnodg,questions:req.questions,rating:req.rating},function (error, html){
                if(error){
                  return next(err);
                }
                sendEmail(nodemailer,req.query.emailhost,html,'Meeting report',res);
              });
            }
          });
        }
      });
    },120000);
    next();
  },
  checkCode:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT kod,datum,vrijeme,end_time,interval,daysofweek FROM event WHERE kod=$1;`,[req.body.code],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            if(result.rows.length >= 1){
              if(result.rows[0].interval==='none'){
                //pokusao sam koristiti moment medjutim imao sam problema pa sam morao ovako "rucno" dobiti vrijeme i datume, bitno da sve radi ;)
                let today = new Date();
                let year = today.getFullYear(),month = today.getMonth() + 1,day = today.getDate();
                let todayFormatted = `${year}-${month}-${day}`;
                let givenDate = new Date(Date.parse(result.rows[0].datum));
                let g = givenDate.getFullYear(),m = parseInt(givenDate.getMonth()) + 1,d = givenDate.getDate();
                givenDate = '' + g + '-' + m + '-' + d;
                if (givenDate === todayFormatted) {
                  checkTime(result.rows[0].vrijeme,result.rows[0].end_time,result.rows[0].kod,res);
                }else if(parseInt(todayFormatted.split('-')[2])-1===parseInt(givenDate.split('-')[2])){
                  let currentTime = new Date().toTimeString().split(' ')[0];
                  if (currentTime < result.rows[0].end_time) {
                    let k = 'http://localhost:3000/event/' + result.rows[0].kod + '/live/questions';
                    res.status(200).send({success:true,ruta:k});
                  }else {
                    res.status(200).send({success:false});
                  }
                }else {
                  res.status(200).send({success:false});
                }
              }else if(result.rows[0].interval==='daily'){
                checkTime(result.rows[0].vrijeme,result.rows[0].end_time,result.rows[0].kod,res);
              }else if(result.rows[0].interval === 'weekly'){
                let daysofweek = result.rows[0].daysofweek;
                let currentDate=new Date();
                if(daysofweek.includes(currentDate.getDay())){
                  checkTime(result.rows[0].vrijeme,result.rows[0].end_time,result.rows[0].kod,res);
                }
              }else if(result.rows[0].interval==='monthly'){
                let temp=new Date(result.rows[0].datum);
                let currentDate = new Date();
                if(currentDate.getDay()===temp.getDay()){
                  checkTime(result.rows[0].vrijeme,result.rows[0].end_time,result.rows[0].kod,res);
                }
              }else{
                res.status(200).send({success:false});
              }
            }else{
              res.status(200).send({success:false});
            }
          }
        });
      }
    });
  },
  getAnsweredQuestions:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT tekst,likes,id,answer FROM questions WHERE event_id=$1 AND status=$2 ORDER BY id DESC;`,[req.body.ev,req.body.an],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            req.questions = result.rows;
            if(req.body.user === 'u'){
              res.render('questions-for-users', { questions: req.questions,ev:req.body.ev }, function(err, html) {
                res.send(html);
              });
            }else{
              res.render('questions', { questions: req.questions,ev:req.body.ev }, function(err, html) {
                res.send(html);
              });
            }
          }
        });
      }
    });
  },
  getSortedByTime:function (req, res, next){
    let first,second;
    if(req.body.filter==='answered'){
      first=2;
      second=2;
    }else if(req.body.filter==='unanswered'){
      first=1;
      second=1;
    }else{
      first=1;
      second=2;
    }
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT tekst,likes,id,answer FROM questions WHERE event_id=$1 AND (status=$2 OR status=$3) ORDER BY id DESC;`,[req.body.ev,first,second],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            req.questions = result.rows;
            if(req.body.user === 'u'){
              res.render('questions-for-users', { questions: req.questions,ev:req.body.ev }, function(err, html) {
                res.send(html);
              });
            }else{
              res.render('questions', { questions: req.questions,ev:req.body.ev }, function(err, html) {
                res.send(html);
              });
            }
          }
        });
      }
    });
  },
  getSortedByLikes:function (req, res, next){
    let first,second;
    if(req.body.filter==='answered'){
      first=2;
      second=2;
    }else if(req.body.filter==='unanswered'){
      first=1;
      second=1;
    }else{
      first=1;
      second=2;
    }
    pool.connect(function (err, client, done){
      if(err){
        console.log(err);
      }else{
        client.query(`SELECT tekst,likes,id,answer FROM questions WHERE event_id=$1 AND (status=$2 or status=$3) ORDER BY likes DESC;`,[req.body.ev,first,second],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            req.questions = result.rows;
            if(req.body.user === 'u'){
              res.render('questions-for-users', { questions: req.questions,ev:req.body.ev }, function(err, html) {
                res.send(html);
              });
            }else{
              res.render('questions', { questions: req.questions,ev:req.body.ev }, function(err, html) {
                res.send(html);
              });
            }
          }
        });
      }
    });
  },
  setRating:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`INSERT INTO rating (event_id,rate) VALUES ($1,$2);`,[req.body.ev,req.body.rate],function (err, result){
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
  getCoverAndRender:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT slika FROM event WHERE kod=$1;`,[req.params.c],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            res.render('users',{questions:req.questions,ev:req.params.c,slika:result.rows[0].slika});
          }
        });
      }
    });
  },
  setIoAndGetQuestions:function (req, res, next){
    let k = req.params.c;
    sobe.push({room: k});
    if(!io){
      io = require('socket.io')(req.socket.server, {allowEIO3: true});
      io.sockets.on('connection', function(client) {
        console.log(sobe[sobe.length-1].room);
        client.join(sobe[sobe.length-1].room);
        sobe[sobe.length-1].id = client.id;
        client.on('end-event',function (data){
          let indeks = sobe.findIndex((sobe) => sobe.id===client.id);
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
                  let indeks = sobe.findIndex((sobe) => sobe.id === client.id);
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
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT tekst,likes,id,answer FROM questions WHERE event_id=$1
        AND status IN(1,2) ORDER BY id DESC;`,[req.params.c],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.questions = result.rows;
            next();
          }
        });
      }
    })
  }
}

function updateEventTime(kod,vrijeme,status){
  let temp;
  if(status){
    temp = new Date().toTimeString().split(' ')[0];
  }else{
    let time = vrijeme;
    let h = parseInt(time[0] + time[1]) + 6;
    if(h>24){h-=24;}
    let m = parseInt(time[3]+time[4]);
    temp = ''+h+':'+m;
  }
  pool.connect(function (err, client, done){
    if(err){
      console.log("Problem in connecting to database");
    }else{
      client.query(`UPDATE event SET end_time=$2 WHERE kod=$1;`,[kod,temp],function (err, result){
        done();
        if(err){
          console.log("Problem in database query");
        }
      });
    }
  });
}


router.post('/check-end', foo.eventStatus);

router.get('/end-meeting/:c',foo.getCounts,function (req, res, next){
  updateEventTime(req.params.c,req.pocetno,true);
  next();
},foo.getQuestions,foo.getRatingAndSendMail,function (req, res, next){
  setTimeout(function (){
    updateEventTime(req.params.c,req.pocetno,false);
  },24 * 60 * 60 * 1000);//vrati vrijeme predavanja za buduca predavanja na linku
  res.redirect('http://localhost:3000/host');
});

router.post('/check', foo.checkCode);

router.post('/send-invites',(req, res) => {
  const emailAddresses = req.body.emails.split(';');
  let html=`<p>You are invited to join the following meeting:</p>
            <p>Meeting code: ${req.body.ev}</p>
           <p>Meeting link: <a href="http://localhost:3000/event/${req.body.ev}/live/questions">Click on me!</a></p>`
  sendEmail(nodemailer,emailAddresses,html,'Invitation to join a meeting',res);
});
router.post('/answered',foo.getAnsweredQuestions);
router.post('/sort-by-time',foo.getSortedByTime);

router.post('/sort-by-likes',foo.getSortedByLikes);

router.get('/:c/rating',function (req, res, next){
  res.render('rating',{ev:req.params.c});
})
router.post('/rate',foo.setRating);

router.get('/:c/live/questions',foo.setIoAndGetQuestions ,foo.getCoverAndRender);

module.exports = router;
