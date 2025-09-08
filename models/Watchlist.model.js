const { upperCase } = require("lodash");
const { Schema, model } = require("mongoose");

const WatchListSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    user: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    exchange: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = model("WatchList", WatchListSchema, "watchList");
