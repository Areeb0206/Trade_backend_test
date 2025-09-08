const Category = require("../../models/Category.model");
const Tags = require("../../models/Tags.model");
const Trade = require("../../models/Trade.model");

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tags = await Tags.find({ categoryId: id });
    const tagsUuid = tags.map((tag) => tag.uuid);
    await Promise.all([
      Category.findOneAndDelete({ uuid: id }),
      Tags.deleteMany({ categoryId: id }),
      Trade.updateMany(
        { categories: id },
        { $pull: { categories: id }, $pullAll: { tags: tagsUuid } }
      ),
    ]);
    res.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteCategory;
