const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const wasteSchema = new Schema({
  name: String,
  quantity: Number,
  category: String,
  city: String,
  sector: String,
  imageUrl: String,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Waste", wasteSchema);
