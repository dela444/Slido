var express = require('express');
var router = express.Router();
var pg = require('pg');
const {isValid,config,deleteMeeting} = require('./config');
var pool = new pg.Pool(config);


var multer = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'C:\\Users\\DELL\\WebstormProjects\\Projekat\\public\\images');
  },
  filename: function (req, file, cb) {
    let naziv = Date.now() + file.originalname;
    cb(null, naziv);
  }
});

var upload = multer({ storage: storage });

let foo ={
  getEvents: function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT name AS ime,kod AS id,datum,vrijeme,interval,daysofweek,(SELECT count(*) FROM questions WHERE event_id=kod AND status = 2) AS broj_odg, 
        (SELECT count(*) FROM questions WHERE event_id = kod AND status = 1) AS broj_neodg FROM event WHERE host_id = $1;`, [req.session.user.id],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.events = result.rows;
            next();
          }
        });
      }

    });
  },
  getAnsweredCount: function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT count(*) FROM questions p INNER JOIN 
        event e on p.event_id = e.kod WHERE e.host_id = $1 AND p.status = 2;`, [req.session.user.id],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            req.broj_odg_u = result.rows[0];
            next();
          }
        });
      }
    });
  },
  getUnansweredCount:function (req, res, next){
    pool.connect(function (err,client,done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT count(*) FROM questions p INNER JOIN 
            event e on p.event_id = e.kod WHERE e.host_id = $1 AND p.status = 1;`,[req.session.user.id],function (err,resul){
          done();
          if(err){
            return next(err);
          }else{
            req.broj_neodg_u = resul.rows[0];
            next();
          }
        });
      }
    });
  },
  getHiddenAndRender:function (req, res, next) {
    pool.connect(function (err, client, done) {
      if (err) {
        return next(err);
      } else {
        client.query(`SELECT tekst,answer FROM questions p INNER JOIN event e ON p.event_id=e.kod WHERE e.host_id=$1 AND p.status=3;`, [req.session.user.id], function (err, result) {
          done();
          if (err) {
            return next(err);
          } else {
            req.hidden = result.rows;
            res.render('host', {
              ime: req.session.user.username,
              events: req.events,
              uodg: JSON.stringify(req.broj_odg_u),
              unodg: JSON.stringify(req.broj_neodg_u),
              hidden: req.hidden
            });
          }
        });
      }
    });
  },
  getCode:function (req, res, next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT kod FROM event WHERE kod=$1;`,[req.params.c],function (err, result){
          done();
          if(err){
            return next(err);
          }else{
            res.render('code',{code:result.rows[0].kod});
          }
        });
      }
    });
  },
  createMeeting:function (req, res, next){
    if (req.file) {
      if (!req.file.filename) {
        req.file.filename = null;
      }
    } else {
      req.file = { filename: null };
    }
    if(req.body.Switch === undefined){
      req.body.Switch = false;
    }
    let date1 = req.body.date, time = req.body.time;
    let h = parseInt(time[0] + time[1]) + 6;
    if(h>=24){h-=24;}
    let m = parseInt(time[3]+time[4]);
    let end_time = ''+h+':'+m, daysofweek='';
    if(req.body['days-of-week']){
      for(let i=0;i<req.body['days-of-week'].length;i++){
        daysofweek += req.body['days-of-week'][i];
      }
    }
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`INSERT INTO event (kod,host_id,name,datum,vrijeme,slika,status,end_time,interval,daysofweek) 
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);`,[req.body.code,req.session.user.id,req.body.name,date1,time,req.file.filename,req.body.Switch,end_time,req.body.interval,daysofweek],function (err,result){
          done();
          if(err){
            return next(err);
          }else{
            res.redirect('http://localhost:3000/host');
          }
        });
      }
    });
  },
  checkCodeHost: function (req,res,next){
    pool.connect(function (err, client, done){
      if(err){
        return next(err);
      }else{
        client.query(`SELECT * FROM event WHERE kod=$1;`,[req.body.code],function (err, result){
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

router.get('/',isValid,foo.getEvents,foo.getAnsweredCount,foo.getUnansweredCount,foo.getHiddenAndRender);

router.post('/create-meeting', upload.single('cover'),foo.createMeeting);

router.get('/:c',foo.getCode);

router.post('/check-code',foo.checkCodeHost);

router.post('/delete-event',function(req, res, next){
  deleteMeeting(req.body.ev,pool);
  res.status(200).send({success:true,eventId:req.body.ev});
});

module.exports = router;
