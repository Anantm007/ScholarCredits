//jshint esversion: 6

const express = require("express");
const router = express.Router();
const Register = require("../Models/registermodel");
const Challenge = require("../Models/challengemodel");
const Submission = require("../Models/challengesubmissionmodel");
const Mentor = require("../Models/mentorsmodel");
const Skill = require("../Models/skillsmodel");
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


router.get('/Mdashboard',async(req,res,next)=>{
    res.render('mentordashboard/mentordashboard');
});


router.post('/Mregister',multer(multerConf).single('ProfileImage'),(req,res)=>{
  const otp = Math.floor(1000 + Math.random() * 9000);

    if(req.body.Password == req.body.CPassword){
        req.body.Password = passwordHash.generate(req.body.Password);
        req.body.CPassword = req.body.Password;
        req.body.ProfileImage = './uploads/'+req.file.filename;
        req.body.Code = '';
        req.body.Auth = 'No';
        req.body.PhoneAuth = 'No';
        req.body.Credit = 100;
        req.body.Otp = otp;
        var code =  randomstring.generate({
            length: 12,
            charset: 'alphabetic'
          });
          req.body.authCode = code;
console.log(req.body);
        Mentor.create(req.body,(err)=>{
            if(err)
            {
              console.log("yo");
                    console.log(err);
                    res.render('mentordashboard/index',{
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

                    // from : config.EmailCredentials.Name,

                    from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
                    to : req.body.Email,
                    subject : "Scholar Credits",
                    text : "Please Authenticate Your Profile By Clicking the link "+fullUrl
                };

                transporter.sendMail(HelperOptions,(err,info)=>{
                    if(err) throw err;
                    console.log("The message was sent");
                });

          res.render('mentordashboard/index',{
              message : 'Registered Successfully Please Check Your Mail'
          });
            }
        });
    }
else{
    res.render('mentordashboard/index');
}
});

router.get('/Mregister/auth/:email/:code',async(req,res)=>{
    const data = await Mentor.update({'Email':req.params.email,'authCode':req.params.code},{'Auth':'Yes'});
if(data){
   res.render('mentordashboard/OtpVerify',{
       message : 'Please Enter the OTP below',
       Startup: data
   });
}
});


router.post('/Mregister/auth/:email/Motpverify', async(req, res)=> {
  const data = await Mentor.findOne({'Email':req.params.email});

if(data){
  if( data.Auth=="Yes" && parseInt(req.body.enteredotp) === parseInt(data.Otp) )
  {
    res.render('mentordashboard/mentordashboard',{
     message : 'Your Profile Has Been Authenticated,You Can Login Now'
   });

    Mentor.findOneAndUpdate({'Email':req.params.email},{'PhoneAuth':'Yes'},function(err, doc)
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

router.get('/Mregister',(req,res)=>{
    res.redirect('/Mdashboard');
});

router.get('/Mlogin',(req,res)=>{
    res.redirect('/Mdashboard');
});


router.post('/Mlogin',(req,res)=>{
    const email = req.body.Email;
    const password = req.body.Password;
    Mentor.findOne({'Email': email},(err,data)=>{
          if(data)
             {
             Challenge.find({'Student':{$nin : [data.Name]}},(err,challenge)=>{
           const result = passwordHash.verify(password,data.Password);
             if(result)
             {
                if(data.Auth == 'No' || data.PhoneAuth == 'No'){
                    res.render('mentordashboard/mentordashboard',{
                        message : 'You Have Not Authenticated Yet!'
                    });
                 }else{
                 req.session.username = email;
                 res.render('mentordashboard/dashboard',{
                     Student : data,
                     Challenge : challenge
                 });
                }


             }
             else{
                 res.render('mentordashboard/mentordashboard',{
                     message : 'Invalid Credentials'
                 });

             }
         }).limit(3);
         }
             else{
                 res.render('mentordashboard/mentordashboard',{
                     message : 'Invalid Credentials'
                 });
        }

    });

 });

router.get('/Mhome',(req,res)=>{
      Mentor.findOne({'Email' : req.session.username},(err,data)=>{
        Challenge.find({'Student':{$nin:[data.Name] }},(err,challenge)=>{
          if(data)
          {
            res.render('mentordashboard/dashboard',{
                Student : data,
                Challenge : challenge
            });
          }
        }).limit(3);
    });
    });


router.get('/Mallchallenges',(req,res)=>{
    if(!req.session.username){
      res.redirect('/Mdashboard');
      }
      else {
          Mentor.findOne({'Email' : req.session.username},(err,data)=>{
          Challenge.find((err,challenge)=>{
        console.log(challenge);
          if(data)
            {
            res.render('mentordashboard/challenges',{
                  Student : data,
                  Challenge : challenge
                  });
                }
          });
        });
    }});


    //used for the filtering the challenge catergory wise
    router.get('/Mallchallenges/:catagery',(req,res)=>{
        const cat = req.params.catagery
        if(!req.session.username){
            res.redirect('/Mdashboard');
        }else{
            Mentor.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Category': cat},(err,challenge)=>{

            if(data)
            {
              res.render('mentordashboard/challenges',{
                  Student : data,
                  Challenge : challenge
              });
            }
      });
    });
    }});


    // this route for the mentor credits
    router.get('/Mcredits',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Mdashboard');
    }else{
        Mentor.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('mentordashboard/rewardcredits',{
            Student : data,
          });
        }
    });
    }});


    router.get('/Minvite/:id', async(req,res) =>
    {
      if(!req.session.username){
          res.redirect('/Mdashboard');
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

    router.get('/Mdetails/:code',(req,res)=>{
        if(!req.session.username){
            res.redirect('/Mdashboard');
        }else{
            Mentor.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.findOne({ '_id' : req.params.code },(err,challenge)=>{
            if(data)
            {
                var example = challenge.Example;
                var extension = path.extname(example);
              res.render('mentordashboard/challenge-details',{
                  Student : data,
                  Challenge : challenge,
                  Extension : extension
              });
            }
      });
    });
}});


router.get('/Maccount',(req,res)=>{
    if(!req.session.username){
        res.redirect('/Mdashboard');
    }else{
        Mentor.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('mentordashboard/myaccount',{
              Student : data
          });
        }
  });
}});

router.get('/Mdashlogout',(req,res)=>{
    req.session.destroy();
    res.redirect('/Mdashboard');
});

router.get('/Mabout', (req,res)=> {
  if(!req.session.username) {
    res.redirect('/Mdashboard');
  }

  else
  {
    Mentor.findOne({'Email': req.session.username}, (err,data) =>{
      if(data)
      {
        res.render('mentordashboard/about_me', {
          Student: data
        });
      }
    });
  }
});

router.post('/Maboutme',multer(multerConf).single('ProfileImage'),(req,res)=>{
    Mentor.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
            if(req.file == undefined){
                req.body.ProfileImage = data.ProfileImage;
                Mentor.update({'Email' : req.session.username},req.body,(err,data)=>{
                    res.redirect('/Maccount');
                });
            }
            else{
                req.body.ProfileImage='./uploads/'+req.file.filename;
                Mentor.update({'Email' : req.session.username},req.body,(err,data)=>{
                    res.redirect('/Maccount');
            });
            }

         }
    });
});

router.post('/Mupdatepass',(req,res)=>{
    Mentor.findOne({'Email':req.body.Email},(err,user)=>{
        const result = passwordHash.verify(req.body.Old,user.Password);
        if(result){
            if(req.body.New === req.body.CNew)
            {
                req.body.Password = passwordHash.generate(req.body.Password);
                req.body.CPassword = req.body.Password;
                console.log(req.body.New);
                console.log(req.body.CNew);
                Mentor.update({'Email':req.body.Email},req.body,(err,result)=>{
                    if (err) throw err;
                    res.render('mentordashboard/mentordashboard',{
                        message : 'Password Changed'
                    });
                });
            }
            else {
                res.render('mentordashboard/mentordashboard',{
                    message : 'Password Has not Changed'
                });
            }
        }
        else {
            res.render('mentordashboard/mentordashboard',{
                message : 'Password Has not Changed'
            });
        }

    });
});


router.get('/Midcardform',async(req,res,next)=>{
    try{
        const data = await Mentor.findOne({'Email':req.session.username});
        if(data){
            res.render('mentordashboard/idcardform',{
                Student : data
            });
        }
    }catch(e){
       next(e);
    }

});

router.get('/Midcard',async(req,res,next)=>{
    try{
        const data = await Mentor.findOne({'Email':req.session.username});
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
            res.render('mentordashboard/idcard',{
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
router.get('/Midcard/:id',async(req,res,next)=>{

    const Id = req.params.id;
    try{
        const data = await Mentor.findOne({'Email':req.session.username});
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
                    res.render('mentordashboard/eachStudent',{
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

router.post('/Mreset',async(req,res,next)=>{
    var Url = req.protocol + '://' + req.get('host') + req.originalUrl;
    var code = await randomstring.generate({
        length: 12,
        charset: 'alphabetic'
      });
    var fullUrl = Url+'/'+req.body.Email+'/'+code;
    try{
    const result = await Mentor.update({'Email':req.body.Email},{'Code':code});
    if(result){
        req.session.code = code;
        let HelperOptions ={
          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
            to : req.body.Email,
            subject : "Scholar Credits Password Reset",
            text : "The link to reset Your password is "+fullUrl
        }

        transporter.sendMail(HelperOptions,(err,info)=>{
            if(err) throw err;
            console.log("The message was sent");
        });
        res.render('mentordashboard/mentordashboard',{
            message : 'Check Your Email'
        });

    }
    }catch(e){
        next(e);
    }
});

router.get('/Mreset/:email/:code',async(req,res,next)=>{
    if(!req.session.code){
        res.redirect('/Mdashboard');
    }else{
    if(req.session.code == req.params.code){
        const email = req.params.email;
        const code = req.params.code;
      const data = await Mentor.findOne({'Email':email,'Code':code});
       if(data)
       {
           res.render('mentordashboard/resetpassword',{
               Email : email
           });
            req.session.destroy();
       }else{
        res.render('mentordashboard/mentordashboard',{
            message : 'Invalid Email'
        });
       }}else{
           res.redirect('/Mdashboard');
       }
    }
});

router.post('/Mchangepass',async(req,res,next)=>{
         if(req.body.New == req.body.CNew){
            const Password = passwordHash.generate(req.body.New);
            const CPassword = Password;
          const result = await Mentor.update({'Email':req.body.Email},{'Password':Password,'CPassword':CPassword});
          if(result) {
              res.render('/mentordashboard/mentordashboard',{
                  message : 'Password Changed'
              });
          }
         }

});

router.get('/Mstudents',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Mdashboard');
    }else{
    const data = await Mentor.findOne({'Email':req.session.username});
    // console.log(data);
   if(data){
    // console.log(req.session.username);
     const students = await Register.find();
     if(students){
        //  console.log(students);
         res.render('mentordashboard/student',{
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
        res.redirect('/Mdashboard');
    }else{
    const data = await Mentor.findOne({'Email':req.session.username});
    // console.log(data);
   if(data){
    // console.log(req.session.username);
    const student = await Register.findOne({'_id':Id});
     if(student){
         res.render('mentordashboard/hire',{
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
        res.redirect('/Mdashboard');
    }else{
    const data = await Mentor.findOne({'Email':req.session.username});
   if(data){
    // console.log(req.session.username);
    const student = await Register.findOne({'_id':Id});
     if(student){
         res.render('mentordashboard/report',{
             Student : data,
             Students : student
         });
     }
   }
}
});

router.post('/Mreport/:id',(req,res)=>{

      const Id = req.params.id;
       Register.findOne({'_id':Id},(err,student) => {
       Mentor.findOne({'Email' : req.session.username},(err,data)=>{

       console.log(req.body);

        let HelperOptions ={
          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
           to : "scholarcredits@gmail.com",
            subject : "A Student has been reported by " + data.Name,
            text : req.body.Description + " The student can be contacted at - " + student.Email
        }

        transporter.sendMail(HelperOptions,(err,info)=>{
            if(err) throw err;
            console.log("The message was sent" );
        });

      });
    });
});

router.get('/Mhelp', async(req, res) => {
  if(!req.session.username){
      res.redirect('/Mdashboard');
  }
  Mentor.findOne({'Email' : req.session.username},(err,data)=>{
  if(data)
  {
    res.render('mentordashboard/we-help',{
        Student : data
    });
  }
});

});


router.get('/Mcouncil',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Mdashboard');
    }
    else{

     const mentor = await Mentor.find({'Email':req.session.username});
     if(mentor){
         res.render('mentordashboard/council',{
                  Student : mentor
              });

     }

    }

});
router.get('/Mdetails/:code',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        Challenge.findOne({ '_id' : req.params.code },(err,challenge)=>{
        if(data)
        {
            var example = challenge.Example;
            var extension = path.extname(example);
          res.render('mentordashboard/challenge-details',{
              Student : data,
              Challenge : challenge,
              Extension : extension
          });
        }
  });
});
}});

router.get('/Mcreatechallenge',async(req,res,next)=>{
    if(!req.session.username){
        res.redirect('/Mdashboard');
    }else{
    try{
        const data= await Mentor.findOne({'Email':req.session.username});
        console.log(data);
        res.render('mentordashboard/create-challenge',{
            Student : data
        });
       }
       catch(e)
       {
           next(e);
       }
    }
});

router.post('/Mcreatechallenge',multer(multerConf).single('Example'),(req,res)=>{
     Mentor.findOne({'Email' : req.session.username},(err,username)=>{
          req.body.Example ='./uploads/'+req.file.filename;
          req.body.Student = username.Name;
          req.body.Status ="Not Submitted";
          req.body.Type
          console.log(username.Credits);
          username.Credits -= req.body.Reward;

          if(req.body.Reward > username.Credits)
          {
            Mentor.findOne({'Email' : req.session.username},(err,data)=>{
            if(data)
            {
              res.render('mentordashboard/insufficient_credits',{
                  Student : data
              });
            }
      });
          }

          else
          {
            console.log(req.body.Reward);
            console.log(username.Credits);
            Mentor.findOneAndUpdate({'Email': req.session.username}, {'Credits': username.Credits}, (err)=> {
              if(err)
              console.log(err);

              else
              console.log("Credits now available " + username.Credits);
            });

           Challenge.create(req.body,(err,data)=>{
                if(data)
                 {
                     console.log(data);
                   res.render('mentordashboard/create-challenge',{
                        message : 'Created Successfuly',
                        Student: username
                    });

                 }
                 else{
                   res.render('mentordashboard/create-challenge',{
                       message : 'Not Created',
                       Student : username
                    });
                 }
             })
           }

      });


     });


router.get('/Mmychallenges',async(req,res,next)=>{
    if(!req.session.username){
                    res.redirect('/Mdashboard');
                }else{
   try{
     const data = await Mentor.findOne({'Email' : req.session.username});

     if(data){
         try{
         const challenge = await Challenge.find({'Student' : data.Name });
         if(challenge){
             res.render('mentordashboard/mychallenges',{
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

router.get('/Msubmit',(req,res)=>{
 if(!req.session.username){
     res.redirect('/Mdashboard');
 }else{
     Mentor.findOne({'Email' : req.session.username},(err,data)=>{
     Challenge.find({'Student':{ $nin : [data.Name]}},(err,challenge)=>{
     if(data)
     {
       res.render('mentordashboard/submit-challenge',{
           Student : data ,
           Challenges : challenge
       });
     }
});
});
}});

router.get('/Maccept',(req,res)=>{
if(!req.session.username){
 res.redirect('/Mdashboard');
}else{
Mentor.findOne({'Email' : req.session.username},(err,data)=>{
 Challenge.find({'Student':{ $nin : [data.Name]}},(err,challenge)=>{
 if(data)
 {
   res.render('mentordashboard/participate-challenge',{
       Student : data ,
       Challenges : challenge
   });
 }
});
});
}});

router.post('/Mparticipate',async(req,res)=>{
const data = await Mentor.findOne({'Email':req.session.username});
if(data){
const challenge = await Challenge.find({'Student':{ $nin : [data.Name]}});
var dt = dateTime.create();
var formatted = dt.format('Y-m-d');
req.body.startDate = formatted;
req.body.username = data.Name;
const result = await Participate.create(req.body);
if(result){
const result = await Challenge.update({'Name':req.body.Name},{'Participated':'Yes'});
res.render('mentordashboard/participate-challenge',{
Student : data,
Challenges : challenge,
message : 'Submitted Successfully'
})
}
}
});



router.get('/Msubmitchallenge',(req,res)=>{
if(!req.session.username){
 res.redirect('/Mdashboard');
}else{
 Mentor.findOne({'Email' : req.session.username},(err,username)=>{
res.render('mentordashboard/submit-challenge',{
   Student : username
});

});
}
});



router.get('/Mviewchallenge/:code',(req,res)=>{

if(!req.session.username)
    res.redirect('/dashboard');
else {
Mentor.findOne({'Email' : req.session.username},(err,data)=>{
    Challenge.findOne({ '_id' : req.params.code },(err,challenge)=>{

        var example = challenge.Example;
        var extension = path.extname(example);
      res.render('mentordashboard/view-challenge-details',{
          Challenge : challenge,
          Extension : extension
      });

});
});

}

});



router.get('/Mclubs',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/Mdashboard');
    }

    else
    {
         const mentor = await Mentor.find({'Email':req.session.username});
         if(mentor){
             res.render('mentordashboard/studentclubs',{
                    // Student : data,
                    Student : mentor
                  });

                }
    }

});

module.exports = router;
