const mongoose = require("mongoose");
const schema = mongoose.Schema;

const ProjectSchema = new schema({
    ProjectTitle : String,
    ProjectDescription : String,
    Student : String,
    StudentId: String

});

const Project = mongoose.model('project',ProjectSchema);

module.exports = Project;
