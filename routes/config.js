
var config = {
    user:'postgres',
    database:'postgres',
    password: '0000',
    host:'localhost',
    port:5432,
    max:1000,
    idleTimeoutMillis: 30000,
}
function deleteMeeting(eventId,pool){
    pool.connect(function (err, client, done){
        if(err){
            //throw new Error("Problem in connecting to database");
            return;
        }else{
            client.query(`DELETE FROM rating WHERE event_id=$1;`,[eventId],function (err, result){
                if(err){
                    //throw new Error("Problem in database query");
                    return;
                }else{
                    client.query(`DELETE FROM questions WHERE event_id=$1;`,[eventId],function (err, result){
                        if(err){
                            //throw new Error("Problem in database query");
                            return;
                        }else{
                            client.query(`DELETE FROM event WHERE kod=$1;`,[eventId],function (err, result){
                                done();
                                if(err){
                                    //throw new Error("Problem in database query");
                                    return;
                                }
                            })
                        }
                    });
                }
            });
        }
    });
}
function checkTime(vrijeme,end_time,kod,res){
    let currentTime = new Date().toTimeString().split(' ')[0];
    if(vrijeme>end_time){
        if(currentTime >= vrijeme){
            let k = 'http://localhost:3000/event/' + kod + '/live/questions';
            res.status(200).send({success: true, ruta: k});
        }else{res.status(200).send({success:false});}
    }else{
        if ((currentTime >= vrijeme && currentTime <= end_time)) {
            let k = 'http://localhost:3000/event/' + kod + '/live/questions';
            res.status(200).send({success: true, ruta: k});
        } else {
            res.status(200).send({success:false});
        }
    }
}
function sendEmail(nodemailer,receivers,content,subject,res){
    var transporter = nodemailer.createTransport({
        service:'Outlook',
        tls:{
            rejectUnauthorized:false
        },
        auth: {
            user: "slidoapp@outlook.com",
            pass: "zerodark01"
        }
    });
    var mailOptions = {
        from: 'slidoapp@outlook.com',
        to: receivers,
        subject: subject,
        text: content,
        html: content
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("Problem in sending mails");//baci neki error ali posalje mail bez problema
        }
        res.status(200).end();
    });
}
module.exports = {
    config,
    isValid: function (req,res,next){
        if(req.session.user){
            next();
        }else{
            res.redirect('http://localhost:3000/login');
        }
    },
    deleteMeeting:deleteMeeting,
    checkTime:checkTime,
    sendEmail:sendEmail
};