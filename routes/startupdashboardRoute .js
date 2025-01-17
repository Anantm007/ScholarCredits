const express = require("express");
const router = express.Router();
const Register = require("../Models/registermodel");
const Challenge = require("../Models/challengemodel");
const Submission = require("../Models/challengesubmissionmodel");
const Skill = require("../Models/skillsmodel");
const Mentor = require("../Models/mentorsmodel")
const Startup = require("../Models/startupmodel");
const passwordHash = require('password-hash');
const Professor = require("../Models/professormodel");
const Project = require("../Models/projectsmodel");
const Interest = require("../Models/interestsmodel");
const Education = require("../Models/educationsmodel");
const Objective = require("../Models/objectsmodel");
const Participate = require("../Models/participatemodel");
const config = require('../config/keys.env');
const randomstring = require("randomstring");
const path = require('path');
const PDFDocument = require('pdfkit');
var fs = require('fs');
var ejs = require('ejs');
var pdf = require('html-pdf');
var phantom = require('phantom');
var pdf = require('dynamic-html-pdf');
var http = require('http');


const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json({type: 'application/json'}));


const multer = require("multer");
const multerConf = {
  storage : multer.diskStorage({
    destination : function(req,file,next){
      next(null,'./public/uploads');
    },
    filename : function(req,file,next){
      const ext = file.mimetype.split("/")[1];
      next(null, file.fieldname + '-' + Date.now()+ "." + ext);
      next(null,file.originalname);
    }
  })
};
const nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
    service : 'gmail',
    secure : false,
    port : 25,
    auth : {
              user : process.env.EmailCredentialsId || config.EmailCredentials.Id,
              pass : process.env.EmailCredentialsPass || config.EmailCredentials.Pass

    },
    tls : {
        rejectUnauthorized : false
    }});


router.get('/Sdashboard',async(req,res,next)=>{
    res.render('startupdashboard/startupdashboard');
});


router.get('/startupregister',(req,res)=>{
    res.render('startupdashboard/register');
});
router.post('/Sregister',multer(multerConf).single('ProfileImage'),(req,res)=>{
console.log(req.body);
    const otp = Math.floor(1000 + Math.random() * 9000);

    if(req.body.Password == req.body.CPassword){
        req.body.Password = passwordHash.generate(req.body.Password);
        req.body.CPassword = req.body.Password;
        req.body.ProfileImage = './uploads/'+req.file.filename;
        req.body.Auth = 'No';
        req.body.Code = '';
        req.body.Otp = otp;
        var code =  randomstring.generate({
            length: 12,
            charset: 'alphabetic'
          });
          req.body.authCode = code;
        Startup.create(req.body,(err)=>{
            if(err)
            {
                res.render('studentdashboard/startupdashboard',{
                    message : 'Registration Unsuccessfull'
                });
            }
            else{
                var Url = req.protocol + '://' + req.get('host') + req.originalUrl;
                var fullUrl = Url+'/'+'auth/'+req.body.Email+'/'+code;

                const smshelper = {

                clientid: config.SMSCredentials.ClientId,
                apikey: config.SMSCredentials.ApiKey,
                sid: config.SMSCredentials.SenderId,

                msg: "Welcome to Scholar Credits. Please check your email and enter OTP " + otp + " to verify your mobile number." ,
                fl: 0,
                gwid: 2
                };

                var options = {
                  host: 'http://sms.shinenetcore.com',
                  port: 80,
                  path: encodeURI('/vendorsms/pushsms.aspx?clientid='+smshelper.clientid +'&apikey=' + smshelper.apikey + '&msisdn=' + req.body.Phone + '&sid=' + smshelper.sid + '&msg=' + smshelper.msg + '&fl=0&&gwid=2')

                };

                const x = options.host + options.path;
                console.log(x);

                http.get(x, (res) => {
                  console.log(res.statusCode);
                  console.log('OTP sent to ' + req.body.Phone);
                  });

                let HelperOptions ={
               from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
                to : req.body.Email,
                 subject : "Scholar Credits",
                 text : "Please Authenticate Your Profile By Clicking the link "+fullUrl
             }

             transporter.sendMail(HelperOptions,(err,info)=>{
                 if(err) throw err;
                 console.log("The message was sent");
             });

          res.render('startupdashboard/startupdashboard',{
              message : 'Registered Successfully, Please check your Email'
          });
            }
        });
    }
else{
    console.log('Do not');
    res.render('startupdashboard/startupdashboard');
}
});

router.get('/Sregister/auth/:email/:code',async(req,res)=>{
    const data = await Startup.update({'Email':req.params.email,'authCode':req.params.code},{'Auth':'Yes'});
if(data){
   res.render('startupdashboard/OtpVerify',{
       message : 'Please Enter the OTP below',
       Startup: data
   });
}
});


router.post('/Sregister/auth/:email/Sotpverify', async(req, res)=> {
  const data = await Startup.findOne({'Email':req.params.email});

if(data){
  if( data.Auth=="Yes" && parseInt(req.body.enteredotp) === parseInt(data.Otp) )
  {
    res.render('startupdashboard/startupdashboard',{
     message : 'Your Profile Has Been Authenticated,You Can Login Now'
   });

    Startup.findOneAndUpdate({'Email':req.params.email},{'PhoneAuth':'Yes'},function(err, doc)
  {
    if(err)
    console.log(err);

    else
    console.log("phone authorized");
  });

  }

  else
  console.log("incorrect");
}

});

router.get('/Sregister',(req,res)=>{
    res.redirect('/Sdashboard');
});

router.get('/Slogin',(req,res)=>{
    res.redirect('/Sdashboard');
});


router.post('/Slogin',(req,res)=>{
    const email = req.body.Email;
    const password = req.body.Password;
    Startup.findOne({'Email': email},(err,data)=>{
          if(data)
             {
                 Challenge.find({'Student':{$nin : [data.Name]}},(err,challenge)=>{
           const result = passwordHash.verify(password,data.Password);
             if(result)
             {
                if(data.Auth == 'No' || data.PhoneAuth == 'No'){
                    res.render('studentdashboard/startupdashboard',{
                        message : 'You Have Not Authenticated Yet!'
                    });
                 }else{
                 req.session.username = email;
                 res.render('startupdashboard/dashboard',{
                     Student : data,
                     Challenge : challenge
                 });
                }


             }
             else{
                 res.render('startupdashboard/startupdashboard',{
                     message : 'Invalid Credentials'
                 });

             }
         }).limit(3);
         }
             else{
                 res.render('startupdashboard/startupdashboard',{
                     message : 'Invalid Credentials'
                 });
        }

    });

 });


      router.get('/Shome',(req,res)=>{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Student':{$nin:[data.Name] }},(err,challenge)=>{
              if(data)
              {
                res.render('startupdashboard/dashboard',{
                    Student : data,
                    Challenge : challenge
                });
              }
            }).limit(3);
        });
        });

        //this route is for conformation hiring mail to the student
        router.post('/conformation/:id',(req,res)=>{
          if(!req.session.username){
              res.redirect('/Sdashboard');
          }else{
              Startup.findOne({'Email' : req.session.username},(err,data)=>{
              if(data)
              {
            const Id = req.params.id;
            //    not running
            const position = req.body.position;
            const time = req.body.time;
            const stipend = req.body.stipend;
            const responsibilities = req.body.responsibilities;

            console.log(req.body.position);
            console.log(req.body.time);
                    Register.findOne({'_id':Id},(err,student) => {
                        const invoiceName = student._id+'.pdf';
                        const invoicePath = path.join('public', 'pdf', invoiceName);

                        const pdfDoc = new PDFDocument();
                        res.setHeader('Content-Type', 'application/pdf');
                        res.setHeader(
                          'Content-Disposition',
                          'inline; filename="' + invoiceName + '"'
                        );
                        pdfDoc.pipe(fs.createWriteStream(invoicePath));


                        pdfDoc.fillColor('red').fontSize(40).text('EDUMONK FOUNDATION', {
                            align: 'left'
                        });

                        pdfDoc.moveDown();
                        pdfDoc.fillColor('red').fontSize(30).text('TALK TO LEARN', {
                            align: 'left',
                            // characterSpacing:"10"
                        });
                        pdfDoc.moveDown();

                        pdfDoc.fillColor('black').fontSize(14).text('Regdunderthecompaniesact,2013', {
                            align: 'left'
                        });
                        pdfDoc.fillColor('black').fontSize(14).text('U80904UP2017NPL098780', {
                            align: 'left'
                        });
                        // use mometm here for define the current date
                        const d = new Date();
                        pdfDoc.fillColor('red').fontSize(14).text('Date - ' + d.toISOString().slice(0,10), {
                            align: 'right'
                        });
                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.moveDown();

                        pdfDoc.fillColor('black').fontSize(25).text('Offer Letter',{
                            underline:'true',
                            bold: "true",
                            align:'center'
                        });

                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("Dear " +student.Name +"," ,{
                        align:'center'
                        });

                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("We feel elated to inform you that you have been selected for internship at Edumonk Foundation as a " + position,{
                            align:'center'
                        });
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("from " + time,{
                            align:'center'
                        });


                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("You will be responsible for " + responsibilities,{
                            align:'center'
                        });



                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("The stipend for the internhsip will be Rs." + stipend,{
                            align:'center'
                        });

                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("Wishing you Best Of Luck for this internhsip and your future!",{
                            align:'center'
                        });

                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("Best Wishes",{
                            align:'left'
                        });
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(16).text("Manish Patel",{
                            align:'left'
                        });
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("Founder & CEO, Edumonk Foundation",{
                            align:'left'
                        });
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("support@edumonk.org",{
                            align:'left',
                            link:'support@edumonk.org'
                        });
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('black').fontSize(14).text("www.edumonk.org",{
                            align:'left',
                            link:'www.edumonk.org'
                        });

                        pdfDoc.moveUp();
                        pdfDoc.moveUp();
                        pdfDoc.moveUp();
                        pdfDoc.fillColor('black').fontSize(14).text("Director",{
                            align:'right',
                            link:'www.edumonk.org'
                        });

                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.moveDown();
                        pdfDoc.fillColor('red').fontSize(14).text("E-41, First Floor, Panchsheel Park, South Delhi, N.D-110017",{
                            align:'center'
                        });

                        let HelperOptions ={
                          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,

                             to : student.Email,
                              subject : "Congrats! You have been selected for an internship role at " + data.Name,
                              text : "Hello, " + student.Name +", we are pleased to inform you that " + data.Name + " have offered you a " + position + " position in their company",
                              attachments: [{
                                filename: invoiceName,
                                path: path.join('public', 'pdf', invoiceName),
                                contentType: 'application/pdf'
                              }]
                          }

                          transporter.sendMail(HelperOptions,(err,info)=>{
                              if(err) {
                                throw err;
                                res.render('startupdashboard/conf_message',{
                                    Student : data,
                                    Message: "There was an error! Please try again later"
                                });

                              }

                              else
                              {
                                console.log("The message was sent");
                                res.render('startupdashboard/conf_message',{
                                    Student : data,
                                    Message: "Confirmation email has been sent."
                                });
                               }

                          });

                          pdfDoc.pipe(res);
                        pdfDoc.end();

                    });
                }
          });
        }});


        router.get('/Screatechallenge',async(req,res,next)=>{
            if(!req.session.username){
                res.redirect('/Sdashboard');
            }else{
            try{
                const data= await Startup.findOne({'Email':req.session.username});
                console.log(data);
                res.render('startupdashboard/create-challenge',{
                    Student : data
                });
               }
               catch(e)
               {
                   next(e);
               }
            }
        });


        router.get('/Smychallenges',async(req,res,next)=>{
            if(!req.session.username){
                            res.redirect('/Sdashboard');
                        }else{
           try{
             const data = await Startup.findOne({'Email' : req.session.username});

             if(data){
                 try{
                 const challenge = await Challenge.find({'Student' : data.Name });
                 if(challenge){
                     res.render('startupdashboard/mychallenges',{
                         Student : data,
                         Challenge : challenge
                     });
                 }}catch(e){
                     next(e);
                 }
               }}catch(e){
                   next(e);
               }
            }
        });


        router.get('/Sallchallenges',(req,res)=>{
            if(!req.session.username){
                res.redirect('/Sdashboard');
            }else{
                Startup.findOne({'Email' : req.session.username},(err,data)=>{
                Challenge.find((err,challenge)=>{
                console.log(challenge);
                if(data)
                {
                  res.render('startupdashboard/challenges',{
                      Student : data,
                      Challenge : challenge
                  });
                }
          });
        });
    }});
    //user for the filtering the challenge catergory wise
    router.get('/Sallchallenges/:catagery',(req,res)=>{
        const cat = req.params.catagery
        if(!req.session.username){
            res.redirect('/Sdashboard');
        }else{
            Startup.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Category': cat},(err,challenge)=>{

            if(data)
            {
              res.render('startupdashboard/challenges',{
                  Student : data,
                  Challenge : challenge
              });
            }
      });
    });
}});


// this route for the startup credits
router.get('/Startupcredits',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('startupdashboard/rewardcredits',{
            Student : data,
          });
        }
  });
}});

router.get('/invite/:id', async(req,res) =>
{
  if(!req.session.username){
      res.redirect('/Sdashboard');
  }

  const smshelper = {

  clientid: config.SMSCredentials.ClientId,
  apikey: config.SMSCredentials.ApiKey,
  // msisdn: Single mobile number or multiple mobile numbers separated by comma(10 digits or +91),
  sid: config.SMSCredentials.SenderId,
  msg: "Welcome to Scholar Credits. Join this awesome challenge to earn awesome rewards and prizes. www.scholarcredits.com/viewchallenge/" + req.params.id,
  fl: 0,
  gwid: 2
  };

  var options = {
    host: 'http://sms.shinenetcore.com',
    port: 80,
    path: encodeURI('/vendorsms/pushsms.aspx?clientid='+smshelper.clientid +'&apikey=' + smshelper.apikey + '&msisdn=' + '9711093860,9643754311' + '&sid=' + smshelper.sid + '&msg=' + smshelper.msg + '&fl=0&&gwid=2')

  };

  const x = options.host + options.path;
  console.log(x);

  http.get(x, (res) => {
    console.log(res.statusCode);
    console.log('message sent');
  });

});


// route for the about the startup
router.get('/Sabout',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('startupdashboard/about_us',{
            Student : data,
          });
        }
  });
}});

    router.get('/Sdetails/:code',(req,res)=>{
        if(!req.session.username){
            res.redirect('/Sdashboard');
        }else{
            Startup.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.findOne({ '_id' : req.params.code },(err,challenge)=>{
            if(data)
            {
                var example = challenge.Example;
                var extension = path.extname(example);
              res.render('startupdashboard/challenge-details',{
                  Student : data,
                  Challenge : challenge,
                  Extension : extension
              });
            }
      });
    });
}});


       router.post('/Screatechallenge',multer(multerConf).single('Example'),(req,res)=>{
            Startup.findOne({'Email' : req.session.username},(err,username)=>{
                 req.body.Example ='./uploads/'+req.file.filename;
                 req.body.Student = username.Name;
                 req.body.Status ="Not Submitted";
                 req.body.Type
                 console.log(username.Credits);
                 username.Credits -= req.body.Reward;

                 if(req.body.Reward > username.Credits)
                 {
                   Startup.findOne({'Email' : req.session.username},(err,data)=>{
                   if(data)
                   {
                     res.render('startupdashboard/insufficient_credits',{
                         Student : data
                     });
                   }
             });
                 }

                 else
                 {
                   console.log(req.body.Reward);
                   console.log(username.Credits);
                   Startup.findOneAndUpdate({'Email': req.session.username}, {'Credits': username.Credits}, (err)=> {
                     if(err)
                     console.log(err);

                     else
                     console.log("Credits now available " + username.Credits);
                   });

                  Challenge.create(req.body,(err,data)=>{
                       if(data)
                        {
                            console.log(data);
                          res.render('startupdashboard/create-challenge',{
                               message : 'Created Successfuly',
                               Student: username
                           });

                        }
                        else{
                          res.render('startupdashboard/create-challenge',{
                              message : 'Not Created',
                              Student : username
                           });
                        }
                    })
                  }

             });


            });

           router.get('/Ssubmit',(req,res)=>{
            if(!req.session.username){
                res.redirect('/Sdashboard');
            }else{
                Startup.findOne({'Email' : req.session.username},(err,data)=>{
                Challenge.find({'Student':{ $nin : [data.Name]}},(err,challenge)=>{
                if(data)
                {
                  res.render('startupdashboard/submit-challenge',{
                      Student : data ,
                      Challenges : challenge
                  });
                }
          });
        });
    }});

    router.get('/Saccept',(req,res)=>{
        if(!req.session.username){
            res.redirect('/Sdashboard');
        }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Student':{ $nin : [data.Name]}},(err,challenge)=>{
            if(data)
            {
              res.render('startupdashboard/participate-challenge',{
                  Student : data ,
                  Challenges : challenge
              });
            }
      });
    });
}});

router.post('/Sparticipate',async(req,res)=>{
  const data = await Startup.findOne({'Email':req.session.username});
  if(data){
     const challenge = await Challenge.find({'Student':{ $nin : [data.Name]}});
  var dt = dateTime.create();
  var formatted = dt.format('Y-m-d');
  req.body.startDate = formatted;
  req.body.username = data.Name;
  const result = await Participate.create(req.body);
  if(result){
      const result = await Challenge.update({'Name':req.body.Name},{'Participated':'Yes'});
      res.render('startupdashboard/participate-challenge',{
          Student : data,
          Challenges : challenge,
          message : 'Submitted Successfully'
      })
  }
  }
});



    router.get('/Ssubmitchallenge',(req,res)=>{
        if(!req.session.username){
            res.redirect('/Sdashboard');
        }else{
            Startup.findOne({'Email' : req.session.username},(err,username)=>{
          res.render('studentdashboard/submit-challenge',{
              Student : username
          });

    });
}
    });

    router.post('/Ssubmitchallenge',multer(multerConf).single('Solution'),(req,res)=>{
        Startup.findOne({'Email' : req.session.username},(err,username)=>{
            Challenge.find((err,challenge)=>{
             req.body.Solution ='./uploads/'+req.file.filename;
             req.body.Username = username.Name;
             req.body.isAuth = 'No';
             req.body.isPOI = 'No';
             req.body.POI = 0;
            Submission.create(req.body,(err,data)=>{
                 if(data)
                  {

                      Challenge.findOne({'Name' : req.body.Name },(err,Name)=>{
                          req.body.Status = "Submitted";
                         Challenge.update({'Name':req.body.Name},req.body,(err,result)=>{
                             if(err) throw err;
                             else{

                                Startup.findOne({'Name' : Name.Student },(err,user)=>{
                          Submission.findOne({'Name' : req.body.Name,'Username':username.Name},(err,sub)=>{
                        let HelperOptions ={
                          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,

                            to : user.Email,
                            subject : "Scholar Credits Challenge Completion",
                            text : sub.Username+" has completed your challenge"
                        }

                        transporter.sendMail(HelperOptions,(err,info)=>{
                            if(err) throw err;
                            console.log("The message was sent");
                        });


                    res.render('startupdashboard/submit-challenge',{
                         message : 'Submitted Successfuly',
                         Student: username,
                         Challenges : challenge
                     });
                    });
                    });
                }
                });
            });
                  }
                  else{
                    res.render('startupdashboard/submit-challenge',{
                        message : 'Submission Failed',
                        Student : username,
                        Challenges : challenge
                     });
                  }
              })
         });
        });
    });

    router.get('/Smysubmission',(req,res)=>{
        if(!req.session.username){
            res.redirect('/Sdashboard');
        }else{
            Startup.findOne({'Email' : req.session.username},(err,data)=>{
            Submission.find({'Username' : data.Name},(err,submission)=>{
            if(data)
            {

                console.log(submission);
              res.render('startupdashboard/my-submission',{
                  Student : data ,
                  Mysubmission : submission
              });
            }
      });
    });
}});

router.get('/Scredits',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('startupdashboard/rewardcredits',{
              Student : data
          });
        }
  });
}});

router.get('/Saccount',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('startupdashboard/myaccount',{
              Student : data
          });
        }
  });
}});

router.get('/Sdashlogout',(req,res)=>{
    req.session.destroy();
    res.redirect('/Sdashboard');
});

router.post('/Saboutme',multer(multerConf).single('ProfileImage'),(req,res)=>{
    Startup.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
            if(req.file == undefined){
                req.body.ProfileImage = data.ProfileImage;
                Startup.update({'Email' : req.session.username},req.body,(err,data)=>{
                    res.redirect('/Saccount');
                });
            }
            else{
                req.body.ProfileImage='./uploads/'+req.file.filename;
                Startup.update({'Email' : req.session.username},req.body,(err,data)=>{
                    res.redirect('/Saccount');
            });
            }

         }
    });
});


router.post('/Smyskills',(req,res)=>{
    Startup.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
             Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                     res.redirect('/Saccount');
             });
         }
    });
});

router.post('/Smyqualification',(req,res)=>{
    Startup.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
             Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                     res.redirect('/Saccount');
             });
         }
    });
});

router.post('/Suploadcv',multer(multerConf).single('CV'),(req,res)=>{
    Startup.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
             req.body.CV = './uploads/'+req.file.filename;
             Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                     res.redirect('/Saccount');
             });
         }
    });
});

router.post('/Supdatepass',(req,res)=>{
    Startup.findOne({'Email':req.body.Email},(err,user)=>{
        const result = passwordHash.verify(req.body.Old,user.Password);
        if(result){
            if(req.body.New === req.body.CNew)
            {
                req.body.Password = passwordHash.generate(req.body.Password);
                req.body.CPassword = req.body.Password;
                console.log(req.body.New);
                console.log(req.body.CNew);
                Register.update({'Email':req.body.Email},req.body,(err,result)=>{
                    if (err) throw err;
                    res.render('startupdashboard/startupdashboard',{
                        message : 'Password Changed'
                    });
                });
            }
            else {
                res.render('startupdashboard/startupdashboard',{
                    message : 'Password Does not Changed'
                });
            }
        }
        else {
            res.render('startupdashboard/startupdashboard',{
                message : 'Password Does not Changed'
            });
        }

    });
});

router.get('/Ssubmittedchallenge',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.find({'Status': 'Submitted','Student': data.Name},(err,challege)=>{
            if (err) throw err;
            else{
                    res.render('startupdashboard/submitted',{
              Challenge : challege,
              Student : data
          });
        }
        });

        }
  });
}});

router.get('/Sparticipatedchallenge',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
    Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.find({'Student':data.Name,'Participated':'Yes'},(err,challege)=>{
            if (err) throw err;
            else{
                    res.render('startupdashboard/participated',{
              Challenge : challege,
              Student : data
          });
        }
        });

        }
  });
}});

router.get('/Sparticipants/:code',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
    Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Participate.find({ 'Name' : req.params.code },(err,submission)=>{
            res.render('startupdashboard/participants',{
                Student : data,
                Solutions : submission,
            });
  });
}
});
}});


router.get('/Ssubmittedchallenge/:code',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Submission.find({ 'Name' : req.params.code },(err,submission)=>{
            if(err) throw err;
            let i;
            // for(i=0;i<=submission.length;i++){
                submission.forEach(function(sub){
                    Register.findOne({'Name':sub.Username},(err,POI)=>{
                        console.log("data is below");
                        console.log(data);
                        console.log("submission is below");
                        console.log(submission);
                        console.log("poi is below");
                        console.log(POI);
                if (err) throw err;
            else{
                // console.log(POI);
                console.log("here is the data");
            res.status(200).render('startupdashboard/solutions',{
              Student : data,
              Solutions : submission,
              POI : POI
          });
        }
        });
    });
    // }
  });
}
});
}});

router.get('/Sauthenticate/:code/:user',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.findOne({ 'Name' : req.params.code },(err,challenge)=>{
            if(err) throw err;
            else{
                console.log(challenge);
                Submission.findOne({'UserEmail':req.params.user,'Name':challenge.Name},(err,submission)=>{
                           Register.findOne({'Name': submission.Username},(err,student)=>{
                        var Credit = student.Credit;
                        var ChallengeReward = challenge.Reward;
                        var Credit = Credit + ChallengeReward;
                        Register.update({'Name': submission.Username},{'Credit':Credit},(err,result)=>{
                            if(err) throw err;
                            else{
                                Submission.update({'UserEmail':req.params.user,'Name':challenge.Name},{'isAuth':'Yes'},(err,done)=>{
                                    if(err) throw err;
                                    else{
                                        res.redirect('back');
                                    }
                                });

                            }
                        });
                           });
                });


            }
          });


}
});
}});

router.post('/Srating/:code/:user',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
        Startup.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.findOne({ 'Name' : req.params.code },(err,challenge)=>{
            if(err) throw err;
            else{
                Submission.findOne({'UserEmail':req.params.user,'Name':challenge.Name},(err,submission)=>{
                    Register.findOne({'Name': submission.Username},(err,student)=>{
                        console.log(student);
                        var POI = parseInt(student.POI);
                        console.log(POI);
                        var ChallengePOI = parseInt(req.body.rating);
                        console.log(ChallengePOI);
                        var POI = POI + ChallengePOI;
                        console.log(POI);
                        Register.update({'Name': submission.Username},{'POI':POI},(err,result)=>{
                            if(err) throw err;
                            else{
                                Submission.update({'UserEmail':req.params.user,'Name':challenge.Name},{'isPOI':'Yes','POI':req.body.rating},(err,done)=>{
                                    if(err) throw err;
                                    else{
                                        console.log('done');
                                        res.redirect('back');
                                    }
                                });

                            }
                        });
                           });
                });


            }
          });


}
});
}});


router.get('/Sidcardform',async(req,res,next)=>{
    try{
        const data = await Startup.findOne({'Email':req.session.username});
        if(data){
            res.render('startupdashboard/idcardform',{
                Student : data
            });
        }
    }catch(e){
       next(e);
    }

});

router.get('/Sidcard',async(req,res,next)=>{
    try{
        const data = await Startup.findOne({'Email':req.session.username});
        if(data){
            try{
            const objective = await Objective.find({'Student':data.Name});
            try{
            const project = await Project.find({'Student':data.Name});
            try{
            const education = await Education.find({'Student':data.Name});
            try{
            const skill = await Skill.find({'Student':data.Name});
            try{
            const interest = await Interest.find({'Student':data.Name});
            try{
            const challenge = await Submission.find({'Username':data.Name});
            res.render('startupdashboard/idcard',{
                Student : data,
                Objective : objective,
                Project : project,
                Education : education,
                Skill : skill,
                Interest : interest,
                Challenge : challenge
            });
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }
    }catch(e){
       next(e);
    }

});

// student indiviuals information
router.get('/Sidcard/:id',async(req,res,next)=>{

    const Id = req.params.id;
    console.log(Id);
    try{
        const data = await Startup.findOne({'Email':req.session.username});
        // console.log(data);
        if(data){
            const student = await Register.findOne({'_id':Id});
            console.log(student);
            console.log(student.Name);
            if(student){
                try{
                    const objective = await Objective.find({'Student':student.Name});
                    try{
                    const project = await Project.find({'Student':student.Name});
                    try{
                    const education = await Education.find({'Student':student.Name});
                    try{
                    const skill = await Skill.find({'Student':student.Name});
                    try{
                    const interest = await Interest.find({'Student':student.Name});
                    try{
                    const challenge = await Submission.find({'Username':student.Name});
                    console.log(challenge,interest,skill,education,project,objective);
                    res.render('startupdashboard/eachStudent',{
                        Student : student,
                        Objective : objective,
                        Project : project,
                        Education : education,
                        Skill : skill,
                        Interest : interest,
                        Challenge : challenge
                    });
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }catch(e){
            next(e);
        }
        }
    }
    }catch(e){
       next(e);
    }

});


router.post('/Saddproject',async(req,res,next)=>{
    try{
   const data = await Startup.findOne({'Email':req.session.username});
   try{
       req.body.Student = data.Name;
   const result = await Project.create(req.body);
   if(result){
       res.redirect('/Sidcardform');
   }
} catch(e){
    next(e);
}
    } catch(e){
        next(e);
    }
});

router.post('/Saddskills',async(req,res,next)=>{
    try{
    const data = await Startup.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
    try{
    const result = await Skill.create(req.body);
    if(result){
        res.redirect('/Sidcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.post('/Saddeducation',async(req,res,next)=>{
    try{
    const data = await Startup.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
    try{
    const result = await Education.create(req.body);
    if(result){
        res.redirect('/Sidcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.post('/Saddinterest',async(req,res,next)=>{
    try{
    const data = await Startup.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
    try{
    const result = await Interest.create(req.body);
    if(result){
        res.redirect('/Sidcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.post('/Saddobjective',async(req,res,next)=>{
    try{
    const data = await Startup.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
    try{
    const result = await Objective.create(req.body);
    if(result){
        res.redirect('/Sidcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.get('/Supdatecard',async(req,res,next)=>{
    try{
       const data = await Startup.findOne({'Email':req.session.username});
       try{
        const skills = await Skill.find({'Student':data.Name});
        try{
            const projects = await Project.find({'Student':data.Name});
            try{
                  const objectives = await Objective.find({'Student':data.Name});
                  try{
                      const interests = await Interest.find({'Student':data.Name});
                      try{
                          const educations = await Education.find({'Student':data.Name});
                          res.render('startupdashboard/updatecard',{
                              Skill : skills,
                              Project : projects,
                              Objective : objectives,
                              Interest : interests,
                              Education : educations,
                              Student : data
                          });
                      } catch(e){
                          next(e);
                      }
                  }catch(e)
                  {
                      next(e);
                  }
            }catch(e){
                next(e);
            }
        }catch(e){
            next(e);
        }
       }catch(e){
           next(e);
       }
    }catch(e){
        next(e);
    }

});

router.post('/Seditobjective/:code',async(req,res,next)=>{
    try{
    const result = await Objective.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/Sdeleteobjective/:code',async(req,res,next)=>{
    try{
    const result = await Objective.remove({'_id':req.params.code});
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/Seditinterest/:code',async(req,res,next)=>{
    try{
    const result = await Interest.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/Sdeleteinterest/:code',async(req,res,next)=>{
    try{
    const result = await Interest.remove({'_id':req.params.code});
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/Seditskill/:code',async(req,res,next)=>{
    try{
    const result = await Skill.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/Sdeleteskill/:code',async(req,res,next)=>{
    try{
    const result = await Skill.remove({'_id':req.params.code});
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/Seditproject/:code',async(req,res,next)=>{
    try{
    const result = await Project.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/Sdeleteproject/:code',async(req,res,next)=>{
    try{
    const result = await Project.remove({'_id':req.params.code});
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/Sediteducation/:code',async(req,res,next)=>{
    try{
    const result = await Education.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/Sdeleteeducation/:code',async(req,res,next)=>{
    try{
    const result = await Education.remove({'_id':req.params.code});
    if(result){
        res.redirect('/Supdatecard');
    }
    }
    catch(e){
        next(e);
    }
});


router.post('/Sreset',async(req,res,next)=>{
    var Url = req.protocol + '://' + req.get('host') + req.originalUrl;
    var code = await randomstring.generate({
        length: 12,
        charset: 'alphabetic'
      });
    var fullUrl = Url+'/'+req.body.Email+'/'+code;
    try{
    const result = await Startup.update({'Email':req.body.Email},{'Code':code});
    if(result){
        req.session.code = code;
        let HelperOptions ={
          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
            to : req.body.Email,
            subject : "Password Reset",
            text : "The link to reset Your password is "+fullUrl
        }

        transporter.sendMail(HelperOptions,(err,info)=>{
            if(err) throw err;
            console.log("The message was sent");
        });
        res.render('startupdashboard/startupdashboard',{
            message : 'Check Your Email'
        });

    }
    }catch(e){
        next(e);
    }
});

router.get('/Sreset/:email/:code',async(req,res,next)=>{
    if(!req.session.code){
        res.redirect('/Sdashboard');
    }else{
    if(req.session.code == req.params.code){
        const email = req.params.email;
        const code = req.params.code;
      const data = await Startup.findOne({'Email':email,'Code':code});
       if(data)
       {
           res.render('startupdashboard/resetpassword',{
               Email : email
           });
            req.session.destroy();
       }else{
        res.render('startupdashboard/startupdashboard',{
            message : 'Invalid Email'
        });
       }}else{
           res.redirect('/Sdashboard');
       }
    }
});

router.post('/Schangepass',async(req,res,next)=>{
         if(req.body.New == req.body.CNew){
            const Password = passwordHash.generate(req.body.New);
            const CPassword = Password;
          const result = await Startup.update({'Email':req.body.Email},{'Password':Password,'CPassword':CPassword});
          if(result) {
              res.render('/startupdashboard/startupdashboard',{
                  message : 'Password Changed'
              });
          }
         }

});

router.get('/students',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
    const data = await Startup.findOne({'Email':req.session.username});
    // console.log(data);
   if(data){
    // console.log(req.session.username);
     const students = await Register.find();
     if(students){
        //  console.log(students);
         res.render('startupdashboard/student',{
             Student : data,
             Students : students
         });
     }
   }
}
});

router.get('/hire/:id',async(req,res)=>{
    const Id = req.params.id;
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
    const data = await Startup.findOne({'Email':req.session.username});
    // console.log(data);
   if(data){
    // console.log(req.session.username);
    const student = await Register.findOne({'_id':Id});
     if(student){
         res.render('startupdashboard/hire',{
             Student : data,
             Students : student
         });
     }
   }
}
});

router.get('/report/:id',async(req,res)=>{
    const Id = req.params.id;
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }else{
    const data = await Startup.findOne({'Email':req.session.username});
   if(data){
    // console.log(req.session.username);
    const student = await Register.findOne({'_id':Id});
     if(student){
         res.render('startupdashboard/report',{
             Student : data,
             Students : student
         });
     }
   }
}
});

router.post('/Sreport/:id',(req,res)=>{

      const Id = req.params.id;
       Register.findOne({'_id':Id},(err,student) => {
       Startup.findOne({'Email' : req.session.username},(err,data)=>{

       console.log(req.body);

        let HelperOptions ={
          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
           to : "scholarcredits@gmail.com",
            subject : student.Name + " has been reported by " + data.Name,
            text : req.body.Description + "\nThe student can be contacted at - " + student.Email + "\nThe company can be contacted at - " + data.Email
        }

        transporter.sendMail(HelperOptions,(err,info)=>{

              if(err) {
                res.render('startupdashboard/conf_message',{
                    Student : data,
                    Message: "There was an error! Please try again later"
                });
                throw err;

              }

              else
              {
                res.render('startupdashboard/conf_message',{
                    Student : data,
                    Message: "The student has been reported. We will review your request and get back to you shortly."
                });
                console.log("The message was sent");

               }
        });

      });
    });
});

router.get('/Shelp', async(req, res) => {
  if(!req.session.username){
      res.redirect('/Sdashboard');
  }


    Startup.findOne({'Email' : req.session.username},(err,data)=>{
    if(data)
    {
      res.render('startupdashboard/we-help',{
          Student : data
      });
    }
});

});


router.get('/Scouncil',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }
    else{

     const startup = await Startup.find({'Email':req.session.username});
     if(startup){
         console.log(startup);
         res.render('startupdashboard/council',{
                // Student : data,
                Student : startup
              });

     }

    }

});


router.get('/Sclubs',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Sdashboard');
    }

    else
    {
         const startup = await Startup.find({'Email':req.session.username});
         if(startup){
             console.log(startup);
             res.render('startupdashboard/studentclubs',{
                    // Student : data,
                    Student : startup
                  });

                }
    }

});

module.exports = router;
