const Category = require("../../models/Category.model");

const updateCategory = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const { id } = req.params;

    await Category.findOneAndUpdate(
      { uuid: id },
      {
        ...(name && { name }),
        ...(color && { color }),
      },
      { new: true }
    );

    res.status(200).json({
      message: "Category updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateCategory;
