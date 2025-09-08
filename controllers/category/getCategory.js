const Category = require("../../models/Category.model");
const getCategory = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const data = await Category.find({
      userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Category fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCategory;
