const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const fileSchema = new Schema({
  fieldname: String,
  originalname: String,
  encoding: String,
  mimetype: String,
  destination: String,
  filename: String,
  path: String,
  size: Number,
});

const File = mongoose.model("file", fileSchema);

module.exports = File;
