const OptionChain = require("../../models/OptionChain.model");

const deltaAnalysis = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    let searchCriteria = {};
    if (startDate && endDate) {
      searchCriteria = {
        expiry: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }
    const data = await OptionChain.aggregate([
      {
        $match: searchCriteria,
      },
      { $unwind: "$data" },
      {
        $match: {
          $expr: { $eq: ["$data.strike", "$strike"] },
        },
      },
      {
        $project: {
          expiry: 1,
          strike: "$data.strike",
          callDelta: "$data.call.delta",
          putDelta: "$data.put.delta",
          closingPrice: "$closePrice",
          expiry: "$expiry",
          date: "$date",
          expiration: "$expiration",
        },
      },
      { $sort: { expiry: -1 } },
      {
        $setWindowFields: {
          sortBy: { expiry: -1 },
          output: {
            previousClosingPrice: {
              $shift: {
                output: "$closingPrice",
                by: 1,
              },
            },
          },
        },
      },
      {
        $addFields: {
          actualDelta: {
            $cond: {
              if: { $eq: ["$previousClosingPrice", null] },
              then: "$putDelta",
              else: {
                $cond: {
                  if: { $lt: ["$closingPrice", "$previousClosingPrice"] },
                  then: "$putDelta",
                  else: "$callDelta",
                },
              },
            },
          },
        },
      },
      {
        $set: {
          absActualDelta: {
            $abs: "$actualDelta",
          },
        },
      },

      {
        $bucket: {
          groupBy: "$absActualDelta",
          boundaries: [0, 0.1, 0.2, 0.55], // Removed the positive infinity boundary.
          default: "other",
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
              ],
              default: "other",
            },
          },
          count: "$count",
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

module.exports = deltaAnalysis;
