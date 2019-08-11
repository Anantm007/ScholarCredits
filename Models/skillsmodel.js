const mongoose = require("mongoose");
const schema = mongoose.Schema;

const SkillSchema = new schema({
    SkillTitle : String,
    SelectLevel : String,
    Student : String,
    StudentId: String

});

const Skill = mongoose.model('skill',SkillSchema);

module.exports = Skill;
