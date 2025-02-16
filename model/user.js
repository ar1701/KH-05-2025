const { name } = require("ejs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");


const userSchema = new Schema({
  email: {
    type: String,
  },
  name: String,
  phone: Number,
  points: {
    type: Number,
    default: 0,
  },
});
userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);
module.exports = User;