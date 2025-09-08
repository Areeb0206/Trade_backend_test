const Tags = require("../../models/Tags.model");
const assignedTags = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;

    const data = await Tags.aggregate([
      {
        $match: {
          userId,
        },
      },
      {
        $group: {
          _id: "$categoryId",
          tags: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "uuid",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $sort: {
          "category.createdAt": -1,
        },
      },
    ]);

    res.status(200).json({
      message: "Tags fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = assignedTags;
