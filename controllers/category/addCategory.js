const httpErrors = require("http-errors");
const Category = require("../../models/Category.model");
const { v4: uuid } = require("uuid");
const addCategory = async (req, res, next) => {
  try {
    const { color, name } = req.body;
    const { uuid: userId } = req.user;

    const isExist = await Category.findOne({ name, userId });
    if (isExist) {
      throw httpErrors.Conflict("Category already exist");
    }
    const category = new Category({
      uuid: uuid(),
      color,
      name,
      userId,
    });
    await category.save();

    res.status(200).json({
      message: "Category added successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addCategory;
