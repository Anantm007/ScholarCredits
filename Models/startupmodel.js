const mongoose = require("mongoose");
const schema = mongoose.Schema;

const startupSchema = new schema({
    Name : String,
    ProfileImage : String,
    Email : { type : String , unique : true },
    Password : String,
    Credits: { type: Number, default: 100 },
    CPassword : String,
    Phone : Number,
    PhoneAuth : {
      type: String,
      default: "No"},
    Otp: Number,
    Address : String,
    City :String,
    About : String,
    Auth : String,
    authCode : String,
    Code : String,
    Website :  String
});

const Startup = mongoose.model('startup',startupSchema);

module.exports = Startup;
