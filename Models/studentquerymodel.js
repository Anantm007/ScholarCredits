const mongoose = require("mongoose");
const schema = mongoose.Schema;

const studentquerymodel = new schema ({
    StudentId : String,
    MentorId : String,
    Message: String,
    Status: String 
});

const StudentQuery = mongoose.model('studentquery', studentquerymodel);

module.exports = StudentQuery;
