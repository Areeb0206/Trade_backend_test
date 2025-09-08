const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");

const deltaAnalysis = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    let searchCriteria = {};
    if (startDate && endDate) {
      searchCriteria = {
        expiry: {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }
    const data = await PolygonOptionChain.aggregate([
      {
        $match: {
          ...searchCriteria,
          closePrice: { $gt: 0 },
        },
      },
      {
        $sort: {
          expiry: -1,
        },
      },
      {
        $project: {
          _id: 1,
          expiry: 1,
          strike: 1,
          date: 1,
          expiration: 1,
          session: 1,
          createdAt: 1,
          greeks: {
            call: {
              $round: ["$greeks.call", 4],
            },
            put: {
              $round: ["$greeks.put", 4],
            },
            actualDelta: {
              $round: ["$greeks.actualDelta", 4],
            },
          },
          closingPrice: "$closePrice",
        },
      },
      {
        $set: {
          absActualDelta: {
            $abs: "$greeks.actualDelta",
          },
        },
      },

      {
        $bucket: {
          groupBy: "$absActualDelta",
          boundaries: [0, 0.1, 0.2, 0.55], // Removed the positive infinity boundary.
          default: "0.55-1",
          output: {
            count: { $sum: 1 },
          },
        },
      },
      {
        $project: {
          _id: 0,
          deltaRange: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "0-0.1" },
                { case: { $eq: ["$_id", 0.1] }, then: "0.1-0.2" },
                { case: { $eq: ["$_id", 0.2] }, then: "0.2-0.55" },
                {
                  case: { $eq: ["$_id", 0.55] },
                  then: "0.55-1",
                },
              ],
              default: "other",
            },
          },
          count: "$count",
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: "$count" },
          data: {
            $push: {
              deltaRange: "$deltaRange",
              count: "$count",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          totalCount: 1,
          data: {
            $map: {
              input: "$data",
              as: "item",
              in: {
                deltaRange: "$$item.deltaRange",
                count: "$$item.count",
                percentage: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$$item.count", "$totalCount"] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      message: "Detail fetch successfully.",
      success: true,
      data: data?.[0]?.data || [],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = deltaAnalysis;
