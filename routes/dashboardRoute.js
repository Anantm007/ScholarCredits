//jshint esversion: 6

const express = require("express");
const router = express.Router();
const Register = require("../Models/registermodel");
const Challenge = require("../Models/challengemodel");
const Submission = require("../Models/challengesubmissionmodel");
const Mentor = require("../Models/mentorsmodel");
const StudentQuery = require("../Models/studentquerymodel");
const Skill = require("../Models/skillsmodel");
const Startup = require("../Models/startupmodel");
const passwordHash = require('password-hash');
const Professor = require("../Models/professormodel");
const Project = require("../Models/projectsmodel");
const Interest = require("../Models/interestsmodel");
const Education = require("../Models/educationsmodel");
const Objective = require("../Models/objectsmodel");
const Participate = require("../Models/participatemodel");
const Query = require("../Models/querymodel.js");
const dateTime = require('node-datetime');
const config = require('../config/keys.env');
const randomstring = require("randomstring");
const path = require('path');
const PDFDocument = require('pdfkit');
var fs = require('fs');
var ejs = require('ejs');
var pdf = require('html-pdf');
var phantom = require('phantom');
var http = require('http');

// var pdf = require('dynamic-html-pdf');


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


router.get('/dashboard',(req,res)=>{
    res.render('studentdashboard/index');
});

router.post('/register',multer(multerConf).single('ProfileImage'),(req,res)=>{
  const otp = Math.floor(1000 + Math.random() * 9000);

    if(req.body.Password == req.body.CPassword){
        req.body.Password = passwordHash.generate(req.body.Password);
        req.body.CPassword = req.body.Password;
        req.body.Credit = 0;
        req.body.CV = '';
        req.body.ProfileImage = './uploads/'+req.file.filename;
        req.body.IDCard = 'False';
        req.body.Code = '';
        req.body.POI = 0;
        req.body.Auth = 'No';
        req.body.Otp = otp;
        var code =  randomstring.generate({
            length: 12,
            charset: 'alphabetic'
          });
          req.body.authCode = code;

        Register.create(req.body,(err)=>{
            if(err)
            {
                res.render('studentdashboard/index',{
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

          res.render('studentdashboard/index',{
              message : 'Registered Successfully Please Check Your Mail'
          });
            }
        });
    }
else{
    res.render('studentdashboard/index');
}
});

router.get('/register/auth/:email/:code',async(req,res)=>{
        const data = await Register.update({'Email':req.params.email,'authCode':req.params.code},{'Auth':'Yes'});
        console.log(data);
   if(data){
       res.render('studentdashboard/OtpVerify',{
           message : 'Please Enter the OTP below',
           Student: data
       });
   }
});

router.post('/register/auth/:email/otpverify', async(req, res)=> {

const data = await Register.findOne({'Email':req.params.email});
if(data){
  console.log(data.Otp);
  if(data.Auth=="Yes" &&  parseInt(req.body.enteredotp) === parseInt(data.Otp) )
  {
    res.render('studentdashboard/index',{
     message : 'Your Profile Has Been Authenticated,You Can Login Now'
   });


      Register.findOneAndUpdate({'Email':req.params.email},{'PhoneAuth':'Yes'},function(err, doc)
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


router.get('/login',(req,res)=>{
   res.redirect('/dashboard');
});

router.get('/register',(req,res)=>{
    res.redirect('/dashboard');
});

router.post('/login',(req,res)=>{

   const email = req.body.Email;
   const password = req.body.Password;
   Register.findOne({'Email': email},(err,data)=>{

         if(data)
            {
                Challenge.find({'Student':{$nin : [data.Name]}},(err,challenge)=>{
          const result = passwordHash.verify(password,data.Password);
            if(result)
            {
                if(data.Auth == 'No' || data.PhoneAuth == 'No'){
                   res.render('studentdashboard/index',{
                       message : 'You Have Not Authenticated Yet!'
                   });
                }else{
                req.session.username = email;
                res.render('studentdashboard/dashboard',{
                    Student : data,
                    Challenge : challenge
                });
            }
                // res.redirect('/studentsprograms');

            }
            else{
                res.render('studentdashboard/index',{
                    message : 'Invalid Credentials'
                });

            }
        }).limit(3);
        }
            else{
                res.render('studentdashboard/index',{
                    message : 'Invalid Credentials'
                });
       }

   });

});

// form for professors

// router.get('/professors-form',(req,res)=>{
//        res.render('studentdashboard/professor_form');
// });

//main dashborad

// router.get('/allpro',(req,res)=>{
//     Register.findOne({'Email' : req.session.username},(err,data)=>{
//         Professor.find((err,prof)=>{
//           if(data)
//           {
//             res.render('studentdashboard/all_professors',{
//                 Student : data,
//                 Professors : prof
//             });
//           }
//     });
//     });
// });

//     router.get('/aboutpro',(req,res)=>{
//         Register.findOne({'Email' : req.session.username},(err,data)=>{
//             Professor.findOne((err,prof)=>{
//               if(data)
//               {
//                 res.render('studentdashboard/professor_profile',{
//                     Student : data,
//                     Professor : prof
//                 });
//               }
//         });
//         });
//     });

      router.get('/home',(req,res)=>{
        Register.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Student':{$nin:[data.Name] }},(err,challenge)=>{
              if(data)
              {
                res.render('studentdashboard/dashboard',{
                    Student : data,
                    Challenge : challenge
                });
              }
            }).limit(3);
        });
        });

        // router.get('/createlession',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/createlession',{
        //               Student : data
        //           });
        //         }
        //   });
        // });

        // router.get('/mylession',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/mylession',{
        //               Student : data
        //           });
        //         }
        //   });
        // });

        // router.get('/alllession',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/alllession',{
        //               Student : data
        //           });
        //         }
        //   });
        // });

        // router.get('/recentlession',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/recentlession',{
        //               Student : data
        //           });
        //         }
        //   });
        // });
        //
        // router.get('/createchallenge',async(req,res,next)=>{
        //     if(!req.session.username){
        //         res.redirect('/dashboard');
        //     }else{
        //     try{
        //         const data= await Register.findOne({'Email':req.session.username});
        //         res.render('studentdashboard/create-challenge',{
        //             Student : data
        //         });
        //        }
        //        catch(e)
        //        {
        //            next(e);
        //        }
        //     }
        // });


        router.get('/mychallenges',async(req,res,next)=>{
            if(!req.session.username){
                            res.redirect('/dashboard');
                        }else{
           try{
             const data = await Register.findOne({'Email' : req.session.username});

             if(data){
                 try{
                 const challenge = await Challenge.find({'Student' : data.Name });
                 if(challenge){
                     res.render('studentdashboard/mychallenges',{
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


        router.get('/allchallenges',(req,res)=>{
            if(!req.session.username){
                res.redirect('/dashboard');
            }else{
            Register.findOne({'Email' : req.session.username},(err,data)=>{
                Challenge.find((err,challenge)=>{

                    // console.log(challenge.Name);
                if(data)
                {
                    // console.log(data);
                    // console.log(challenge);

                  res.render('studentdashboard/challenges',{
                      Student : data,
                      Challenge : challenge
                  });
                }
          });
        });
    }});
// ADD FOR TESTING PURPOSE
    router.get('/allchallenges/:catagery',(req,res)=>{
        const cat = req.params.catagery
        // console.log(cat);
        if(!req.session.username){
            res.redirect('/dashboard');
        }else{
        Register.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Category': cat},  (err,challenge)=>{
            console.log(challenge);
            if(data)
            {
                // console.log(data);
                // console.log(challenge);
              res.render('studentdashboard/challenges',{
                  Student : data,
                  Challenge : challenge
              });
            }
      });
    });
}});

    router.get('/details/:code',(req,res)=>{
        if(!req.session.username){
            res.redirect('/dashboard');
        }else{
        Register.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.findOne({ '_id' : req.params.code },(err,challenge)=>{
            if(data)
            {
                var example = challenge.Example;
                var extension = path.extname(example);
              res.render('studentdashboard/challenge-details',{
                  Student : data,
                  Challenge : challenge,
                  Extension : extension
              });
            }
      });
    });
}});
router.get('/viewchallenge/:code',(req,res)=>{
    // if(!req.session.username){
    //     res.redirect('/dashboard');
    // }else{
    // Register.findOne({'Email' : req.session.username},(err,data)=>{
        Challenge.findOne({ '_id' : req.params.code },(err,challenge)=>{

            var example = challenge.Example;
            var extension = path.extname(example);
          res.render('studentdashboard/view-challenge-details',{
            //   Student : data,
              Challenge : challenge,
              Extension : extension
          });

  });
});


router.get('/viewstartup/:code',(req,res)=>{

        Startup.findOne({ '_id' : req.params.code },(err,startup)=>{

          res.render('studentdashboard/view-startup-details',{

              Startup : startup
          });

  });
});





        // router.get('/createcircle',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/createcircle',{
        //               Student : data
        //           });
        //         }
        //   });
        // });

        // router.get('/mycircle',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/mycirlce',{
        //               Student : data
        //           });
        //         }
        //   });
        // });

        // router.get('/allcircle',(req,res)=>{
        //     Register.findOne({'Email' : req.session.username},(err,data)=>{
        //         if(data)
        //         {
        //           res.render('studentdashboard/allcircle',{
        //               Student : data
        //           });
        //         }
        //   });
        // });
    //
    //     router.post('/createchallenge',multer(multerConf).single('Example'),(req,res)=>{
    //         Register.findOne({'Email' : req.session.username},(err,username)=>{
    //              req.body.Example ='./uploads/'+req.file.filename;
    //              req.body.Student = username.Name;
    //              req.body.Status ="Not Submitted";
    //              req.body.Participated = 'No';
    //              var dt = dateTime.create();
    //              var formatted = dt.format('Y-m-d');
    //              req.body.StartDate = formatted;
    //             Challenge.create(req.body,(err,data)=>{
    //                  if(data)
    //                   {
    //                       console.log(data);
    //                     res.render('studentdashboard/create-challenge',{
    //                          message : 'Created Successfuly',
    //                          Student: username
    //                      });
    //
    //                   }
    //                   else{
    //                     res.render('studentdashboard/create-challenge',{
    //                         message : 'Not Created',
    //                         Student : username
    //                      });
    //                   }
    //               })
    //          });
    //         });
    //
           router.get('/submit',(req,res)=>{
            if(!req.session.username){
                res.redirect('/dashboard');
            }else{
            Register.findOne({'Email' : req.session.username},(err,data)=>{
                Challenge.find({'Student':{ $nin : [data.Name]}},(err,challenge)=>{
                if(data)
                {
                  res.render('studentdashboard/submit-challenge',{
                      Student : data ,
                      Challenges : challenge
                  });
                }
          });
        });
    }});

    router.get('/accept',(req,res)=>{
        if(!req.session.username){
            res.redirect('/dashboard');
        }else{
        Register.findOne({'Email' : req.session.username},(err,data)=>{
            Challenge.find({'Student':{ $nin : [data.Name]}},(err,challenge)=>{
            if(data)
            {
              res.render('studentdashboard/participate-challenge',{
                  Student : data ,
                  Challenges : challenge
              });
            }
      });
    });
}});

router.post('/participate',async(req,res)=>{
  const data = await Register.findOne({'Email':req.session.username});
  if(data){
     const challenge = await Challenge.find({'Student':{ $nin : [data.Name]}});
  var dt = dateTime.create();
  var formatted = dt.format('Y-m-d');
  req.body.startDate = formatted;
  req.body.username = data.Name;
  const result = await Participate.create(req.body);
  if(result){
      const result = await Challenge.update({'Name':req.body.Name},{'Participated':'Yes'});
      res.render('studentdashboard/participate-challenge',{
          Student : data,
          Challenges : challenge,
          message : 'Submitted Successfully'
      })
  }
  }
});

    router.get('/submitchallenge',(req,res)=>{
        if(!req.session.username){
            res.redirect('/dashboard');
        }else{
            Register.findOne({'Email' : req.session.username},(err,username)=>{
          res.render('studentdashboard/submit-challenge',{
              Student : username
          });

    });
}
    });

    router.post('/submitchallenge',multer(multerConf).single('Solution'),(req,res)=>{
        Register.findOne({'Email' : req.session.username},(err,username)=>{
            Challenge.find((err,challenge)=>{
             req.body.Solution ='./uploads/'+req.file.filename;
             req.body.Username = username.Name;
             req.body.UserEmail = username.Email;
             req.body.isAuth = 'No';
             req.body.isPOI = 'No';
             req.body.POI = 0;
             Submission.findOne({'Name':req.body.Name,'Username':username.Name},(err,any)=>{
                        if(any){
                            res.render('studentdashboard/submit-challenge',{
                                message : 'Already Submitted',
                                Student: username,
                                Challenges : challenge
                            });
                        }else{


            Submission.create(req.body,(err,data)=>{
                 if(data)
                  {

                      Challenge.findOne({'Name' : req.body.Name },(err,Name)=>{
                          req.body.Status = "Submitted";
                         Challenge.update({'Name':req.body.Name},req.body,(err,result)=>{
                             if(err) throw err;
                             else{

                      Register.findOne({'Name' : Name.Student },(err,user)=>{
                          if(user == null){
                          Startup.findOne({'Name': Name.Student},(err,user)=>{

                                console.log(user);
                          Submission.findOne({'Name' : req.body.Name,'Username':username.Name},(err,sub)=>{
                              console.log(sub);
                        let HelperOptions ={
                          from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,
                            to : user.Email,
                            subject : "Scholar Credits Challenge Completeion",
                            text : sub.Username+" has completed your challenge"
                        }

                        transporter.sendMail(HelperOptions,(err,info)=>{
                            if(err) throw err;
                            console.log("The message was sent");
                        });


                    res.render('studentdashboard/submit-challenge',{
                         message : 'Submitted Successfuly',
                         Student: username,
                         Challenges : challenge
                     });
                    });
                });
                }else{

                    Submission.findOne({'Name' : req.body.Name,'Username':username.Name},(err,sub)=>{
                        console.log(sub);
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


              res.render('studentdashboard/submit-challenge',{
                   message : 'Submitted Successfuly',
                   Student: username,
                   Challenges : challenge
               });
              });
                }
                    });
                }
                });
            });
                  }
                  else{
                    res.render('studentdashboard/submit-challenge',{
                        message : 'Submission Failed',
                        Student : username,
                        Challenges : challenge
                     });
                  }
              })
            }
        });
         });
        });
    });

    router.get('/mysubmission',(req,res)=>{
        if(!req.session.username){
            res.redirect('/dashboard');
        }else{
        Register.findOne({'Email' : req.session.username},(err,data)=>{
            Submission.find({'Username' : data.Name},(err,submission)=>{
            if(data)
            {

                console.log(submission);
              res.render('studentdashboard/my-submission',{
                  Student : data ,
                  Mysubmission : submission
              });
            }
      });
    });
}});

router.get('/credits',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('studentdashboard/rewardcredits',{
              Student : data
          });
        }
  });
}});

router.get('/account',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
          res.render('studentdashboard/myaccount',{
              Student : data
          });
        }
  });
}});

router.get('/dashlogout',(req,res)=>{
    req.session.destroy();
    res.redirect('/dashboard');
});

router.post('/aboutme',multer(multerConf).single('ProfileImage'),(req,res)=>{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
            if(req.file == undefined){
                req.body.ProfileImage = data.ProfileImage;
                Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                    res.redirect('/account');
                });
            }
            else{
                req.body.ProfileImage='./uploads/'+req.file.filename;
                Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                    res.redirect('/account');
            });
            }

         }
    });
});

// router.post('/aboutme',(req,res)=>{
//     Register.findOne({'Email' : req.session.username},(err,data)=>{
//          if(data){
//              if(req.body.ProfileImage == ''){
//                  req.body.ProfileImage = data.ProfileImage;
//              }
//              Register.update({'Email' : req.session.username},req.body,(err,data)=>{
//                      res.redirect('/account');
//              });
//          }
//     });
// });

router.post('/myskills',(req,res)=>{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
             Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                     res.redirect('/account');
             });
         }
    });
});

router.post('/myqualification',(req,res)=>{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
             Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                     res.redirect('/account');
             });
         }
    });
});

router.post('/uploadcv',multer(multerConf).single('CV'),(req,res)=>{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
         if(data){
             req.body.CV = './uploads/'+req.file.filename;
             Register.update({'Email' : req.session.username},req.body,(err,data)=>{
                     res.redirect('/account');
             });
         }
    });
});

router.post('/updatepass',(req,res)=>{
    Register.findOne({'Email':req.body.Email},(err,user)=>{
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
                    res.render('studentdashboard/index',{
                        message : 'Password Changed'
                    });
                });
            }
            else {
                res.render('studentdashboard/index',{
                    message : 'Password Does not Changed'
                });
            }
        }
        else {
            res.render('studentdashboard/index',{
                message : 'Password Does not Changed'
            });
        }

    });
});

router.get('/submittedchallenge',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.find({'Status': 'Submitted','Student': data.Name},(err,challege)=>{
            if (err) throw err;
            else{
                    res.render('studentdashboard/submitted',{
              Challenge : challege,
              Student : data
          });
        }
        });

        }
  });
}});

router.get('/participatedchallenge',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.find({'Student':data.Name,'Participated':'Yes'},(err,challege)=>{
            if (err) throw err;
            else{
                    res.render('studentdashboard/participated',{
              Challenge : challege,
              Student : data
          });
        }
        });

        }
  });
}});


router.get('/solution/:code',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Submission.find({ 'Name' : req.params.code },(err,submission)=>{
            if(err) throw err;
                submission.forEach(function(sub){
            Register.findOne({'Name':sub.Username},(err,POI)=>{
                if (err) throw err;
            else{
                console.log(POI);
            res.render('studentdashboard/solutions',{
              Student : data,
              Solutions : submission,
              POI : POI
          });
        }
        });
    });
  });
}
});
}});

router.get('/participants/:code',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Participate.find({ 'Name' : req.params.code },(err,submission)=>{
            res.render('studentdashboard/participants',{
                Student : data,
                Solutions : submission,
            });
  });
}
});
}});


router.get('/authenticate/:code/:user',(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.findOne({ 'Name' : req.params.code },(err,challenge)=>{
            if(err) throw err;
            else{
                Submission.findOne({'UserEmail':req.params.user},(err,submission)=>{
                           Register.findOne({'Name': submission.Username},(err,student)=>{
                        var Credit = student.Credit;
                        var ChallengeReward = (challenge.Reward)/2;
                        var Credit = Credit + ChallengeReward;
                        Register.update({'Name': submission.Username},{'Credit':Credit},(err,result)=>{
                            if(err) throw err;
                            else{
                                Submission.update({'UserEmail':req.params.user},{'isAuth':'Yes'},(err,done)=>{
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

router.post('/rating/:code/:user',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    Register.findOne({'Email' : req.session.username},(err,data)=>{
        if(data)
        {
        Challenge.findOne({ 'Name' : req.params.code },(err,challenge)=>{
            if(err) throw err;
            else{
                Submission.findOne({'UserEmail':req.params.user},(err,submission)=>{
                           Register.findOne({'Name': submission.Username},(err,student)=>{
                        var POI = parseInt(student.POI);
                        var ChallengePOI = (parseInt(req.body.rating))/2;
                        console.log(ChallengePOI);
                        var POI = POI + ChallengePOI;
                        Register.update({'Name': submission.Username},{'POI':POI},(err,result)=>{
                            if(err) throw err;
                            else{
                                Submission.update({'UserEmail':req.params.user},{'isPOI':'Yes','POI':ChallengePOI},(err,done)=>{
                                    if(err) throw err;
                                    else{
                                        console.log(done);
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


router.get('/idcardform',async(req,res,next)=>{
    try{
        const data = await Register.findOne({'Email':req.session.username});
        if(data){
            res.render('studentdashboard/idcardform',{
                Student : data
            });
        }
    }catch(e){
       next(e);
    }

});
router.get('/idcard/download',async(req,res,next)=>{
    try{
        const data = await Register.findOne({'Email':req.session.username});
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

            console.log(data.Name);
            const invoiceName = 'idcard.pdf';
            const invoicePath = path.join('public', 'pdf', invoiceName);

            const pdfDoc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
              'Content-Disposition',
              'inline; filename="' + invoiceName + '"'
            );
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            pdfDoc.fontSize(40).text('Idcard', {
                align: 'center'
            });

            pdfDoc.fillColor('#c55f38').fontSize(30).text(data.Name);
            pdfDoc.fillColor('#868e96').fontSize(14).text(data.Phone);
            pdfDoc.fillColor('#c55f38').fontSize(14).text(data.Email);

            objective.forEach(objectives => {
                pdfDoc.fontSize(14).text(objectives.Objective);
            });



          pdfDoc.fillColor('#212529').fontSize(30).text('Projects');

          project.forEach(projects => {
            pdfDoc.fillColor('#212529').fontSize(21).text( projects.ProjectTitle);

            pdfDoc.fillColor('#868e96').fontSize(14).text(projects.ProjectDescription);
        });

           pdfDoc.fillColor('#212529').fontSize(30).text('Education');
           education.forEach(educations => {
            pdfDoc.fillColor('#212529').fontSize(14).text(educations.Instname);
            pdfDoc.fillColor('#868e96').fontSize(14).text(educations.Duration);
            pdfDoc.fillColor('#868e96').fontSize(14).text(educations.Marks);

        });
        pdfDoc.fillColor('#212529').fontSize(30).text('SKILLS');
        pdfDoc.fillColor('#212529').fontSize(20).text('PROGRAMMING LANGUAGES & TOOLS');

        skill.forEach(skills => {
            if(skills.SelectLevel == 'Basic'){
            pdfDoc.fillColor('#868e96').fontSize(14).text(skills.SkillTitle + '=>' + skills.SelectLevel);
            }
            if(skills.SelectLevel == 'Intermediate'){
                pdfDoc.fillColor('#868e96').fontSize(14).text(skills.SkillTitle + '=>' + skills.SelectLevel);
            }
            if(skills.SelectLevel == 'Advance'){
                pdfDoc.fillColor('#868e96').fontSize(14).text(skills.SkillTitle + '=>' + skills.SelectLevel);
            }

        });

        pdfDoc.fillColor('#212529').fontSize(30).text("CREDITS EARNED BY " + data.Name);

        pdfDoc.fillColor('#868e96').fontSize(20).text(data.Credits);

        pdfDoc.fillColor('#868e96').fontSize(20).text("Credits");


        pdfDoc.fillColor('#212529').fontSize(30).text("INTERESTS");
            interest.forEach(interests => {
                pdfDoc.fillColor('#868e96').fontSize(14).text(interests.Interest);
            });


            pdfDoc.fillColor('#212529').fontSize(30).text("CHALLENGES");


            challenge.forEach(challenges => {
                pdfDoc.fillColor('#212529').fontSize(20).text("CHALLENGES CARD");

                pdfDoc.fillColor('#868e96').fontSize(17).text("NAME: "+ challenges.Name);

                pdfDoc.fillColor('#868e96').fontSize(14).text("POI: "+ challenges.POI);

                pdfDoc.fillColor('#868e96').fontSize(14).text( challenges.Description );
            });

            pdfDoc.end();

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
router.get('/idcard',async(req,res,next)=>{
    try{
        const data = await Register.findOne({'Email':req.session.username});
        if(data){
            try{
            const objective = await Objective.find({'StudentId':data.id});
            try{
            const project = await Project.find({'StudentId':data.id});
            try{
            const education = await Education.find({'StudentId':data.id});
            try{
            const skill = await Skill.find({'StudentId':data.id});
            try{
            const interest = await Interest.find({'StudentId':data.id});
            try{
            const challenge = await Submission.find({'Username':data.id});


            res.render('studentdashboard/idcard',{
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



router.post('/addproject',async(req,res,next)=>{
    try{
   const data = await Register.findOne({'Email':req.session.username});
   try{
       req.body.Student = data.Name;
req.body.StudentId = data.id;

   const result = await Project.create(req.body);
   if(result){
       res.redirect('/idcardform');
   }
} catch(e){
    next(e);
}
    } catch(e){
        next(e);
    }
});

router.post('/addskills',async(req,res,next)=>{
    try{
    const data = await Register.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
req.body.StudentId = data.id;
    try{
    const result = await Skill.create(req.body);
    if(result){
        res.redirect('/idcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.post('/addeducation',async(req,res,next)=>{
    try{
    const data = await Register.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
req.body.StudentId = data.id;
    try{
    const result = await Education.create(req.body);
    if(result){
        res.redirect('/idcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.post('/addinterest',async(req,res,next)=>{
    try{
    const data = await Register.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
req.body.StudentId = data.id;
    try{
    const result = await Interest.create(req.body);
    if(result){
        res.redirect('/idcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.post('/addobjective',async(req,res,next)=>{
    try{
    const data = await Register.findOne({'Email':req.session.username});
    req.body.Student = data.Name;
req.body.StudentId = data.id;
    try{
    const result = await Objective.create(req.body);
    if(result){
        res.redirect('/idcardform');
    }}
    catch(e){
        next(e);
    }
}catch(e){
    next(e);
}
});

router.get('/updatecard',async(req,res,next)=>{
    try{
       const data = await Register.findOne({'Email':req.session.username});
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
                          res.render('studentdashboard/updatecard',{
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

router.post('/editobjective/:code',async(req,res,next)=>{
    try{
    const result = await Objective.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/deleteobjective/:code',async(req,res,next)=>{
    try{
    const result = await Objective.remove({'_id':req.params.code});
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/editinterest/:code',async(req,res,next)=>{
    try{
    const result = await Interest.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/deleteinterest/:code',async(req,res,next)=>{
    try{
    const result = await Interest.remove({'_id':req.params.code});
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/editskill/:code',async(req,res,next)=>{
    try{
    const result = await Skill.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/deleteskill/:code',async(req,res,next)=>{
    try{
    const result = await Skill.remove({'_id':req.params.code});
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/editproject/:code',async(req,res,next)=>{
    try{
    const result = await Project.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/updatecard');Sregister
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/deleteproject/:code',async(req,res,next)=>{
    try{
    const result = await Project.remove({'_id':req.params.code});
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.post('/editeducation/:code',async(req,res,next)=>{
    try{
    const result = await Education.update({'_id':req.params.code},req.body);
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});

router.get('/deleteeducation/:code',async(req,res,next)=>{
    try{
    const result = await Education.remove({'_id':req.params.code});
    if(result){
        res.redirect('/updatecard');
    }
    }
    catch(e){
        next(e);
    }
});


router.post('/reset',async(req,res,next)=>{
    var Url = req.protocol + '://' + req.get('host') + req.originalUrl;
    var code = await randomstring.generate({
        length: 12,
        charset: 'alphabetic'
      });
    var fullUrl = Url+'/'+req.body.Email+'/'+code;
    try{
    const result = await Register.update({'Email':req.body.Email},{'Code':code});
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
        res.render('studentdashboard/index',{
            message : 'Check Your Email'
        });

    }
    }catch(e){
        next(e);
    }
});

router.get('/reset/:email/:code',async(req,res,next)=>{
    if(!req.session.code){
        res.redirect('/dashboard');
    }else{
    if(req.session.code == req.params.code){
        const email = req.params.email;
        const code = req.params.code;
      const data = await Register.findOne({'Email':email,'Code':code});
       if(data)
       {
           res.render('studentdashboard/resetpassword',{
               Email : email
           });
            req.session.destroy();
       }else{
        res.render('studentdashboard/index',{
            message : 'Invalid Email'
        });
       }}else{
           res.redirect('/dashboard');
       }
    }
});

router.post('/changepass',async(req,res,next)=>{
         if(req.body.New == req.body.CNew){
            const Password = passwordHash.generate(req.body.New);
            const CPassword = Password;
          const result = await Register.update({'Email':req.body.Email},{'Password':Password,'CPassword':CPassword});
          if(result) {
              res.redirect('/dashboard');
          }
         }

});

router.post('/enquiry',async(req,res)=>{
  const result = Query.create(req.body);
  if(result)
  {
      res.redirect('back');
  }
});

router.get('/digital',async(req,res)=>{
    res.render('digital');
});

router.get('/startups',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    const data = await Register.findOne({'Email':req.session.username});
   if(data){
     const startup = await Startup.find();
     if(startup){
         console.log(startup);
         res.render('studentdashboard/startups',{
             Student : data,
             Startup : startup
         });
     }
   }
}
});


router.get('/council',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    const data = await Register.findOne({'Email':req.session.username});
   if(data){
     const startup = await Startup.find();
     if(startup){
         console.log(startup);
         res.render('studentdashboard/council',{
             Student : data,
             Startup : startup
         });
     }
   }
}
});



router.get('/clubs',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    const data = await Register.findOne({'Email':req.session.username});
   if(data){
     const startup = await Startup.find();
     if(startup){
         console.log(startup);
         res.render('studentdashboard/studentclubs',{
             Student : data,
             Startup : startup
         });
     }
   }
}
});

router.get('/query/:id', async(req,res) => {
    if(!req.seesion.username)
    {
      res.redirect('/dashboard');
    }

    else
    {
      const mentor = await Mentor.findOne({'_id':req.params.id});
      const data = await Register.findOne({'Email': req.session.username});
      if(data)
      {
        res.render('studentdashboard/query');
      }

    }

});

router.get('/mentors',async(req,res)=>{
    if(!req.session.username){
        res.redirect('/dashboard');
    }else{
    const data = await Register.findOne({'Email':req.session.username});
   if(data){
     const mentor = await Mentor.find();
     if(mentor){
       console.log(mentor);
         res.render('studentdashboard/mentors',{
             Student : data,
             Startup : mentor
         });
     }
   }
}
});

router.get('/enquire/:id', async(req,res) =>{
  if(!req.session.username){
      res.redirect('/dashboard');
  }
  else
  {
    const student = await Register.findOne({'Email':req.session.username});

    if(student)
    {
      const mentor = await Mentor.findOne({'_id': req.params.id});
      if(mentor){
          res.render('studentdashboard/enquiry',{
              Student : student,
              Students : mentor
          });
      }
    }
 }
});

router.post('/enquire/:id', async(req,res) =>{
  if(!req.session.username){
      res.redirect('/dashboard');
  }

    else
    {
      const student = await Register.findOne({'Email':req.session.username});

          if(student)
          {
            Mentor.findOne({'_id': req.params.id}, (err, mentor) =>{
            if(err)
            console.log(err);

            else
            {

                req.body.StudentId = student.id;
                req.body.Status = "Not Resolved";
                req.body.MentorId = req.params.id;
                req.body.MentorEmail = mentor.Email;
                req.body.StudentEmail = student.Email;
                console.log(req.body);
                StudentQuery.create(req.body);

                res.render('studentdashboard/conf_message',{
                    Student: mentor,
                    Message : 'Your query has been submitted and sent to the mentor. They will get back to you shortly.'
                });
            }


          });
        }

    }
});


module.exports = router;
