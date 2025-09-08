// models/UploadedCsv.model.js
const mongoose = require("mongoose");

const UploadedCsvSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true },
    //user uuid
    userId: { type: String, required: true },
    //   account uuid
    accountId: {
      type: String,
      required: true,
    },
    brokerName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "UploadedCsv",
  UploadedCsvSchema,
  "uploadedCsvs"
);
