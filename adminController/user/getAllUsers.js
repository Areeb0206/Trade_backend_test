const User = require("../../models/User.model");

const getAllUsers = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword } = req.query;
    if (keyword) {
      searchCriteria["$or"] = [
        { "user.firstName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.lastName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.userHandle": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.email": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$user.firstName", " ", "$user.lastName"] },
              regex: `${keyword.trim()}.*`,
              options: "i",
            },
          },
        },
      ];
    }
    const data = await User.aggregate([
      {
        $match: {
          ...searchCriteria,
          role: "customer",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [{ $skip: +start || 0 }, { $limit: +limit || 10 }],
          count: [
            {
              $count: "total",
            },
          ],
        },
      },
    ]);

    res.json({
      message: "Fetched successfully",
      data: data?.[0]?.data,
      totalDocs: data?.[0]?.count?.[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllUsers;
