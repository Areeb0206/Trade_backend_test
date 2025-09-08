const OptionChain = require("../../models/OptionChain.model");

const deltaValue = async (req, res, next) => {
  try {
    const { start, limit } = req.query;

    const data = await OptionChain.aggregate([
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
        $addFields: {
          percentChange: {
            $cond: {
              if: { $eq: ["$previousClosingPrice", null] },
              then: null,
              else: {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$closingPrice", "$previousClosingPrice"] },
                      "$previousClosingPrice",
                    ],
                  },
                  100,
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          expiry: 1,
          strike: 1,
          actualDelta: 1,
          closingPrice: 1,
          callDelta: 1,
          putDelta: 1,
          date: 1,
          expiration: 1,
          percentChange: {
            $round: ["$percentChange", 3],
          },
        },
      },
      {
        $facet: {
          data: [{ $skip: +start || 0 }, { $limit: +limit || 10 }],
          count: [{ $count: "total" }],
        },
      },
    ]);

    res.status(200).json({
      message: "Detail fetch successfully.",
      success: true,
      count: data[0]?.count[0]?.total || 0,
      data: data[0]?.data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = deltaValue;
