const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");


const adminSchema = new Schema({
  email: {
    type: String,
  },
  name: String,
  phone: Number,
});
adminSchema.plugin(passportLocalMongoose);
const Admin = new mongoose.model("Admin", adminSchema);
module.exports = Admin;