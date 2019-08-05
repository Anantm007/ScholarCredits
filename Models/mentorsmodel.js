const mongoose = require("mongoose");
const schema = mongoose.Schema;

const mentorSchema = new schema({
  Name: String,
  ProfileImage: String,
  Password : String,
  Email : { type : String , unique : true },
  Credit: Number,
  CPassword : String,
  Phone : {
    type: Number,
    unique: true
  },
  Company: String,
  PhoneAuth : String,
  LinkedIn: String,
  Otp: Number,
  Auth : String,
  authCode : String,
  Code : String,
});

const Mentor = mongoose.model('mentor', mentorSchema);

module.exports = Mentor;
