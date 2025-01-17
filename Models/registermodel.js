const mongoose = require("mongoose");
const schema = mongoose.Schema;

const registerSchema = new schema({
    Name : String,
    ProfileImage : String,
    Gender : String,
    Email : { type : String , unique : true },
    Password : String,
    CPassword : String,
    Phone : {
      type: Number,
      unique: true
    },
    PhoneAuth : {
      type: String,
      default: "No"},
    Otp: Number,
    College: String,
    Location : String,
    City :String,
    Credit : Number,
    Code : String,
    IDCard : String,
    POI : Number,
    Auth : String,
    authCode : String
});

const Register = mongoose.model('register',registerSchema);

module.exports = Register;
