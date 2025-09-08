const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");

const deltaStreak = async (req, res, next) => {
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
          uuid: 1,
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
        $project: {
          actualDelta: "$absActualDelta",
        },
      },
    ]);

    res.status(200).json({
      message: "Detail fetch successfully.",
      success: true,
      data: data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = deltaStreak;
