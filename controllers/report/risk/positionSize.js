const Trade = require("../../../models/Trade.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const positionSize = async (req, res, next) => {
  const {
    accountIds,
    startDate,
    endDate,
    status,
    result,
    tradeType,
    pnlType = "netPnl",
    tags,
    symbol,
  } = req.query;

  const searchCriteria = searchBy({
    startDate,
    endDate,
    status,
    result,
    tradeType,
    tags,
    symbol,
  });

  try {
    const data = await Trade.aggregate([
      {
        $set: {
          executionSize: { $size: "$executions" },
          groupingDate: {
            $cond: [
              { $eq: ["$status", "closed"] },
              "$closeDate",
              "$latestExecutionDate",
            ],
          },
          positionSize: {
            $cond: [
              { $eq: ["$side", "short"] },
              "$adjustedProceed",
              "$adjustedCost",
            ],
          },
          profit: {
            $cond: [
              { $eq: ["$calculationMethod", "fifo"] },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
            ],
          },
        },
      },
      {
        $set: {
          breakEven: {
            $or: [
              { $eq: ["$breakEven", true] },
              {
                $and: [{ $eq: ["$status", "closed"] }, { $eq: ["$profit", 0] }],
              },
            ],
          },
          result: {
            $cond: [{ $eq: ["$breakEven", true] }, "breakEven", "$result"],
          },
        },
      },
      { $match: { executionSize: { $gt: 0 } } },
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
          ...searchCriteria,
        },
      },
      {
        $project: {
          groupingDate: 1,
          positionSize: 1,
          totalCommission: 1,
          profit: 1,
        },
      },
      {
        $bucket: {
          groupBy: "$positionSize",
          boundaries: [
            0,
            5000,
            10000,
            15000,
            20000,
            25000,
            30000,
            35000,
            40000,
            Infinity,
          ],
          default: null,
          output: {
            totalTrades: { $sum: 1 },
            totalWinningTrade: {
              $sum: { $cond: [{ $gt: ["$profit", 0] }, 1, 0] },
            },
            totalLoosingTrade: {
              $sum: { $cond: [{ $lt: ["$profit", 0] }, 1, 0] },
            },
            totalCommission: { $sum: "$totalCommission" },
            avgProfit: { $avg: "$profit" },
            positionSize: { $sum: "$positionSize" },
            avgPositionSize: { $avg: "$positionSize" },
            minPrice: { $min: "$profit" },
            maxPrice: { $max: "$profit" },
            totalProfit: {
              $sum: { $cond: [{ $gt: ["$profit", 0] }, "$profit", 0] },
            },
            totalLoss: {
              $sum: { $cond: [{ $lt: ["$profit", 0] }, "$profit", 0] },
            },
            pnl: { $sum: "$profit" },
          },
        },
      },
      {
        $densify: {
          field: "_id",
          range: {
            step: 5000,
            bounds: [0, 45000],
          },
        },
      },
      { $match: { _id: { $gte: 0 } } },
      {
        $addFields: {
          range: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 0] }, then: "0 - 4999.99" },
                { case: { $eq: ["$_id", 5000] }, then: "5000 - 9999.99" },
                { case: { $eq: ["$_id", 10000] }, then: "10000 - 14999.99" },
                { case: { $eq: ["$_id", 15000] }, then: "15000 - 19999.99" },
                { case: { $eq: ["$_id", 20000] }, then: "20000 - 24999.99" },
                { case: { $eq: ["$_id", 25000] }, then: "25000 - 29999.99" },
                { case: { $eq: ["$_id", 30000] }, then: "30000 - 34999.99" },
                { case: { $eq: ["$_id", 35000] }, then: "35000 - 39999.99" },
                { case: { $eq: ["$_id", 40000] }, then: "40000 or more" },
              ],
              default: "Unknown",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          range: 1,
          totalTrades: 1,
          totalWinningTrade: 1,
          totalLoosingTrade: 1,
          avgProfit: 1,
          positionSize: 1,
          avgPositionSize: 1,
          minPrice: 1,
          maxPrice: 1,
          totalProfit: 1,
          totalLoss: 1,
          pnl: 1,
          totalCommission: 1,
          winPercent: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$totalWinningTrade",
                      { $max: ["$totalTrades", 1] },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
          lossPercent: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$totalLoosingTrade",
                      { $max: ["$totalTrades", 1] },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = positionSize;
