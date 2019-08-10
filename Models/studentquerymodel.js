const mongoose = require("mongoose");
const schema = mongoose.Schema;

const studentquerymodel = new schema ({
    StudentId : String,
    MentorId : String,
    StudentEmail: String,
    MentorEmail: String,
    Description: String,
    Status: String
});

const StudentQuery = mongoose.model('studentquery', studentquerymodel);

module.exports = StudentQuery;
