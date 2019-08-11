const mongoose = require("mongoose");
const schema = mongoose.Schema;

const InterestSchema = new schema({
    Interest : String,
    Student : String,
    StudentId: String

});

const Interest = mongoose.model('interest',InterestSchema);

module.exports = Interest;
