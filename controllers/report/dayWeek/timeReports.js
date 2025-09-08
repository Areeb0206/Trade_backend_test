const Trade = require("../../../models/Trade.model");
const { searchBy } = require("../../../utils/socket/searchBy");

const timeReports = async (req, res, next) => {
  const {
    accountIds,
    startDate,
    endDate,
    status,
    result,
    tradeType,
    pnlType = "netPnl",
    tags,
    timeFrameInterval = "30", // Default to hourly (60 minutes)
    timeFrameColumn = "openDate",
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

  let timeFrameMinutes = parseInt(timeFrameInterval, 10); // Convert to a number
  let mongoTimeFrameFormat = `%H:%M`; // Default to hourly format
  let groupingIntervalMilliseconds = 60 * 60 * 1000; // Hourly default
  if (timeFrameMinutes === 15) {
    mongoTimeFrameFormat = "%H:%M";
    groupingIntervalMilliseconds = 15 * 60 * 1000;
  } else if (timeFrameMinutes === 30) {
    mongoTimeFrameFormat = "%H:%M";
    groupingIntervalMilliseconds = 30 * 60 * 1000;
  }

  try {
    const data = await Trade.aggregate([
      {
        $match: {
          accountId: { $in: accountIds.split(",") },
        },
      },

      {
        $set: {
          executionSize: {
            $size: "$executions",
          },
          groupingDate: {
            $cond: [
              { $eq: [timeFrameColumn, "openDate"] },
              "$openDate",
              {
                $cond: [
                  { $eq: ["$status", "closed"] },
                  "$closeDate",
                  "$latestExecutionDate",
                ],
              },
            ],
          },
          // here we are calculating the total position size
          positionSize: {
            $cond: [
              {
                $eq: ["$side", "short"],
              },
              "$adjustedProceed",
              "$adjustedCost",
            ],
          },

          profit: {
            $cond: [
              {
                $eq: ["$calculationMethod", "fifo"], // If it's netPnl and fifo, return fifo.netPnl
              },
              `$fifo.${pnlType}`,
              `$wa.${pnlType}`,
            ],
          },
          breakEven: {
            $cond: {
              if: {
                $eq: ["$breakEven", true] || { $eq: ["$profit", 0] },
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $set: {
          breakEven: {
            $cond: [
              {
                $or: [
                  { $eq: ["$breakEven", true] },
                  {
                    $and: [
                      { $eq: ["$status", "closed"] },
                      { $eq: ["$profit", 0] },
                    ],
                  },
                ],
              },
              true, // Add 1 if the condition is true
              false, // Add 0 if the condition is false
            ],
          },
        },
      },
      {
        $set: {
          result: {
            $cond: {
              if: {
                $eq: ["$breakEven", true],
              },
              then: "breakEven",
              else: "$result",
            },
          },
        },
      },
      {
        $set: {
          timeSlot: {
            $toDate: {
              $subtract: [
                { $toLong: { $toDate: "$groupingDate" } },
                {
                  $mod: [
                    { $toLong: { $toDate: "$groupingDate" } },
                    groupingIntervalMilliseconds,
                  ],
                },
              ],
            },
          },
        },
      },
      {
        $set: {
          timeFrame: {
            $dateToString: {
              format: mongoTimeFrameFormat,
              date: "$timeSlot",
              timezone: "America/New_York",
            },
          },
        },
      },
      //fetch trades with execution size greater than 0
      {
        $match: {
          executionSize: { $gt: 0 },

          ...searchCriteria,
        },
      },
      {
        $project: {
          timeFrame: 1,
          groupingDate: 1,
          totalQuantity: 1,
          positionSize: 1,
          totalCommission: 1,
          profit: 1,
          positiveProfit: {
            $cond: {
              if: { $gt: ["$profit", 0] },
              then: "$profit",
              else: 0,
            },
          },
          negativeProfit: {
            $cond: {
              if: { $lt: ["$profit", 0] },
              then: "$profit",
              else: 0,
            },
          },
          totalWinningTrade: {
            $cond: {
              if: { $gt: ["$profit", 0] },
              then: 1,
              else: 0,
            },
          },
          totalLoosingTrade: {
            $cond: {
              if: { $lt: ["$profit", 0] },
              then: 1,
              else: 0,
            },
          },
          uv: 1,
        },
      },

      {
        $group: {
          _id: "$timeFrame",
          totalTrades: { $sum: 1 },
          totalProfit: { $sum: "$positiveProfit" },
          totalLoss: { $sum: "$negativeProfit" },
          totalVolume: { $sum: "$totalQuantity" },
          totalCommission: { $sum: "$totalCommission" },
          pnl: { $sum: "$profit" },
          totalWinningTrade: { $sum: "$totalWinningTrade" },
          totalLoosingTrade: { $sum: "$totalLoosingTrade" },
          //since i am using brush chart, i need to have a default value as 0 for every week
          uv: {
            $sum: "$uv",
          },
          avgPositionSize: { $avg: "$positionSize" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          timeSlot: "$_id",
          totalTrades: {
            $cond: [{ $ifNull: ["$totalTrades", false] }, "$totalTrades", 0],
          },
          totalProfit: {
            $cond: [{ $ifNull: ["$totalProfit", false] }, "$totalProfit", 0],
          },
          totalLoss: 1,
          avgPositionSize: 1,
          totalVolume: 1,
          totalCommission: 1,
          totalWinningTrade: 1,
          totalLoosingTrade: 1,
          uv: 1,
          winPercent: {
            $cond: [
              { $eq: ["$totalTrades", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$totalWinningTrade", "$totalTrades"],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
          lossPercent: {
            $cond: [
              { $eq: ["$totalTrades", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$totalLoosingTrade", "$totalTrades"],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
          //this is required, coz on client side we are displaying graph, if pnl is null, then it will not start from 0,

          pnl: {
            $cond: [{ $ifNull: ["$pnl", false] }, "$pnl", 0],
          },
        },
      },
    ]);

    // Generate all possible time slots
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ); // Today at 00:00:00

    const allTimeSlots = [];
    for (let i = 0; i < (24 * 60) / timeFrameMinutes; i++) {
      // Number of intervals in a day
      const time = new Date(
        startOfDay.getTime() + i * timeFrameMinutes * 60 * 1000
      );
      const formattedTime = time
        .toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(/^24/, "00");
      allTimeSlots.push(formattedTime);
    }

    // Create a map of existing data for easier lookup
    const dataMap = new Map(data.map((item) => [item.timeSlot, item]));

    // Fill in missing time slots with default values
    const filledData = allTimeSlots.map((timeSlot) => {
      if (dataMap.has(timeSlot)) {
        return dataMap.get(timeSlot);
      } else {
        return {
          timeSlot: timeSlot,
          totalTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          avgPositionSize: 0,
          totalVolume: 0,
          totalCommission: 0,
          totalWinningTrade: 0,
          totalLoosingTrade: 0,
          uv: 0,
          winPercent: 0,
          lossPercent: 0,
          pnl: 0,
        };
      }
    });

    res.status(200).json({
      success: true,
      data: filledData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = timeReports;
