const mongoose = require("mongoose");
const schema = mongoose.Schema;

const challengeSchema = new schema({
    Category : String,
    Subcategory : String,
    Type:String,
    Name : String,
    Eligibility:String,
    StartDate: Date,
    EndDate: Date,
    Reward : String,
    Link : String,
    Example : String,
    Student : String,
    Description : String,
    Status : String,
    Participated : String,
    NumberOfSubmissions: {
      type: Number,
      default: 0
    }

});

const Challenge = mongoose.model('challenge',challengeSchema);

module.exports = Challenge;
