const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");

const polygonOptionChainDeltaValue = async (req, res, next) => {
  try {
    const { start, limit } = req.query;

    const data = await PolygonOptionChain.aggregate([
      {
        $match: {
          closePrice: { $gt: 0 },
        },
      },
      { $sort: { expiry: -1 } },
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

module.exports = polygonOptionChainDeltaValue;

// {
//   $project: {
//     _id: 1,
//     expiry: 1,
//     strike: 1,
//     date: 1,
//     expiration: 1,
//     session: 1,
//     createdAt: 1,
//     previousDelta: {
//       call: {
//         $round: ["$previousDelta.call", 4],
//       },
//       put: {
//         $round: ["$previousDelta.put", 4],
//       },
//       actualDelta: {
//         $round: ["$previousDelta.actualDelta", 4],
//       },
//     },
//     closingPrice: "$closePrice",
//   },
// },

// const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");

// const polygonOptionChainDeltaValue = async (req, res, next) => {
//   try {
//     const { start, limit } = req.query;

//     const data = await PolygonOptionChain.aggregate([
//       { $unwind: "$data" },
//       {
//         $match: {
//           $expr: { $eq: ["$data.strike_price", "$strike"] },
//         },
//       },
//       {
//         $project: {
//           expiry: 1,
//           session: 1,
//           strike: "$data.strike_price",
//           callDelta: "$data.call.greeks.delta",
//           putDelta: "$data.put.greeks.delta",
//           closingPrice: "$closePrice",
//           expiry: "$expiry",
//           date: "$date",
//           expiration: "$expiration",
//           createdAt: "$createdAt",
//         },
//       },
//       { $sort: { expiry: -1 } },
//       // {
//       //   $setWindowFields: {
//       //     sortBy: { expiry: -1 },
//       //     output: {
//       //       previousClosingPrice: {
//       //         $shift: {
//       //           output: "$closingPrice",
//       //           by: 1,
//       //         },
//       //       },
//       //     },
//       //   },
//       // },
//       {
//         $addFields: {
//           actualDelta: {
//             $cond: {
//               if: { $eq: ["$session.change", null] },
//               then: "$putDelta",
//               else: {
//                 $cond: {
//                   if: { $lt: ["$session.change", 0] },
//                   then: "$putDelta",
//                   else: "$callDelta",
//                 },
//               },
//             },
//           },
//         },
//       },
//       // {
//       //   $addFields: {
//       //     percentChange: {
//       //       $cond: {
//       //         if: { $eq: ["$previousClosingPrice", null] },
//       //         then: null,
//       //         else: {
//       //           $multiply: [
//       //             {
//       //               $divide: [
//       //                 { $subtract: ["$closingPrice", "$previousClosingPrice"] },
//       //                 "$previousClosingPrice",
//       //               ],
//       //             },
//       //             100,
//       //           ],
//       //         },
//       //       },
//       //     },
//       //   },
//       // },
//       {
//         $project: {
//           _id: 1,
//           expiry: 1,
//           strike: 1,
//           actualDelta: {
//             $round: ["$actualDelta", 4],
//           },
//           closingPrice: 1,
//           callDelta: {
//             $round: ["$callDelta", 4],
//           },
//           putDelta: {
//             $round: ["$putDelta", 4],
//           },
//           date: 1,
//           expiration: 1,
//           // percentChange: {
//           //   $round: ["$percentChange", 3],
//           // },
//           session: 1,
//           createdAt: 1,
//           session: 1,
//         },
//       },
//       {
//         $facet: {
//           data: [{ $skip: +start || 0 }, { $limit: +limit || 10 }],
//           count: [{ $count: "total" }],
//         },
//       },
//     ]);

//     res.status(200).json({
//       message: "Detail fetch successfully.",
//       success: true,
//       count: data[0]?.count[0]?.total || 0,
//       data: data[0]?.data,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// module.exports = polygonOptionChainDeltaValue;
