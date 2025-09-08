// const httpErrors = require("http-errors");
const Trades = require("../../models/Trade.model");
const Executions = require("../../models/Execution.model");

const deleteTrade = async (req, res, next) => {
  try {
    //if isDeleted is not passed, then default it to true
    const { ids, deleteAll, accountIds, isDeleted = true } = req.body;
    if (deleteAll && accountIds?.length > 0) {
      await Promise.all([
        Trades.updateMany(
          {
            accountId: {
              $in: accountIds,
            },
          },
          {
            $set: {
              isDeleted,
            },
          }
        ),
        // Executions.deleteMany({
        //   accountId: {
        //     $in: accountIds,
        //   },
        // }),
      ]);
    } else {
      await Promise.all([
        Trades.updateMany(
          {
            uuid: {
              $in: ids,
            },
          },
          {
            $set: {
              isDeleted,
            },
          }
        ),
        // delete all executions related to the trade
        // Executions.deleteMany({
        //   tradeId: {
        //     $in: ids,
        //   },
        // }),
      ]);
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteTrade;
