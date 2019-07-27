const express = require("express");
const router = express.Router();
const Register = require('../Models/registermodel');
const Query = require('../Models/querymodel');
const passwordHash = require('password-hash');
const Challenge = require("../Models/challengemodel");
const Startup = require("../Models/startupmodel");

router.get('/',async(req,res)=>{
   const challenge = await Challenge.find().sort({'_id' : -1}).limit(10);
   const startup = await Startup.find().sort({'_id': -1}).limit(10);
   if(startup)
   console.log(startup);
   if(challenge){
    res.render('landing',{
        Challenge : challenge,
        Startup: startup
    });}});

module.exports = router;
