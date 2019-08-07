const express = require("express");
const router = express.Router();
const Register = require('../Models/registermodel');
const Query = require('../Models/querymodel');
const passwordHash = require('password-hash');
const Challenge = require("../Models/challengemodel");
const Startup = require("../Models/startupmodel");
const config = require('../config/keys.env');

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

router.get('/',async(req,res)=>{
   const challenge = await Challenge.find().sort({'_id' : -1}).limit(10);
   const startup = await Startup.find().sort({'_id': -1}).limit(10);
   if(startup)
   {

     if(challenge){
      res.render('landing',{
          Challenge : challenge,
          Startup: startup
      });

   }
 }

 });

router.get('/pricing', async(req,res) =>{
     res.render('pricing');

});


router.get('/aboutus', async(req,res) =>{
     res.render('aboutvalues');

});

 router.post('/enquiry', async(req, res) => {

    console.log(req.body);
    let HelperOptions ={
      from : (process.env.EmailCredentialsName || config.EmailCredentials.Name) + '<'+ (process.env.EmailCredentialsId || config.EmailCredentials.Id)+'>' ,

          to : "scholarcredits@gmail.com",
          subject : req.body.Name + " has submitted a query - " + req.body.Subject,
          text : req.body.Message + "They can be contacted at - " + req.body.Email
      };

      transporter.sendMail(HelperOptions,(err,info)=>{
          if(err) throw err;
          console.log("The message was sent");
      });

    res.redirect("/");
 });


module.exports = router;
