//jshint esversion: 6
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require('express-session');
const config = require('./config/keys.env');


const user = process.env.DatabaseUsername || 'edudev';
const pass = process.env.DatabasePass || 'edudev';
const url = "mongodb+srv://" + user + ":" + pass +  "@cluster0-vljvr.mongodb.net/test?retryWrites=true&&w=majority";
//const url = "mongodb+srv://edudev:edudev@cluster0-vljvr.mongodb.net/test?retryWrites=true&&w=majority";
//const url="mongodb:"+config.Database.Username+":"+config.Database.Password+"@cluster0-vljvr.mongodb.net/test?retryWrites=true&&w=majority"//@ds161485.mlab.com:61485/edumonk";
mongoose.Promise = global.Promise;
mongoose.connect(url,{useNewUrlParser: true},(err,db)=>{
    if(err) throw err;
    else
    {
        console.log('database connected');
    }
});

//getting form data in json format
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    secret : config.SessionKey.Secret,
    resave : false,
    saveUninitialized : true
}));

//using middlewares
app.use(express.static('./public'));


//view engine
app.set('view engine','ejs');
app.set('views','./Views');

//routes
app.use(require('./routes/adminroutes.js'));
app.use(require('./routes/edumonk.js'));
app.use(require('./routes/dashboardRoute.js'));
app.use(require('./routes/startupdashboardRoute .js'));
app.use(require('./routes/mentorDashboardRoute.js'))

//creating server
app.listen(process.env.PORT || 3000,()=>{
     console.log("Server started at 3000");

});
