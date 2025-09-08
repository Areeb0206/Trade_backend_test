const UploadCsv = require("../../models/UploadCsv.model");

/**
 * Login for existing users
 *
 * @author Areeb
 * @since 8 Jul 2023
 */
const getCsvRecordList = async (req, res, next) => {
  try {
    let searchCriteria = {};
    const { start, limit, keyword } = req.query;
    if (keyword) {
      searchCriteria["$or"] = [
        { "user.firstName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.lastName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.email": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.userHandle": { $regex: `${keyword.trim()}.*`, $options: "i" } },
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
    const data = await UploadCsv.aggregate([
      {
        $lookup: {
          from: "user",
          localField: "userId",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: searchCriteria,
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
      message: "Fetched successfully1",
      data: data?.[0]?.data,
      count: data?.[0]?.count?.[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCsvRecordList;
