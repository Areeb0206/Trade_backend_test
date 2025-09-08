const OptionChain = require("../../models/OptionChain.model");

const deltaStreak = async (req, res, next) => {
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
        $project: {
          actualDelta: 1,
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
