const { Schema, model } = require("mongoose");

const CategorySchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    //uuid of the user
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Category = model("Category", CategorySchema, "categories");

module.exports = Category;
