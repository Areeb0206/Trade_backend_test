const Executions = require("../../../models/Execution.model");
const Trade = require("../../../models/Trade.model");
const optionsLongCal = require("../../trade/optionsLongCal");
const optionsShortCal = require("../../trade/optionsShortCal");
const convertToNumber = require("../../util/convertToNumber");
const _ = require("lodash");

const updateOldRecord = async ({
  data,
  broker,
  accountId,
  tradeType = "option",
}) => {
  try {
    // First fetch the records that match the filter scenario
    const filter = {
      accountId: accountId,
      brokerName: broker,
      $expr: { $lt: ["$closeDate", "$openDate"] },
      status: "closed",
      tradeType,
      isDeleted: false,
    };
    const tradeHavingCloseDateBeforeTheEntryDate = await Trade.find({
      ...filter,
    });

    // if no trades found, return
    if (tradeHavingCloseDateBeforeTheEntryDate.length === 0) {
      return;
    }

    // now fetch all the executions that are within the trades
    const allExecutions = await Executions.find({
      tradeId: {
        $in: tradeHavingCloseDateBeforeTheEntryDate.map((trade) => trade.uuid),
      },
    });

    // now i have data array , that is coming from APi, it contains all the executions
    // now i will find those orderIds that are within these execution

    // here are all the orderIds, for the executions that are saved in the database
    const orderIds = allExecutions.map((execution) => execution.orderId);

    // now i will find those executions from the data array , that is saved in database and also that i queried
    const filteredExecutions = data.filter((execution) =>
      orderIds.includes(execution.TradeID?.toString())
    );

    //if any field is updated from api, then we also need to update the executions that are in the database
    const updatedExecutions = allExecutions?.map((execution) => {
      const matchingExecution = filteredExecutions.find(
        (exec) => exec.TradeID?.toString() === execution.orderId
      );
      if (matchingExecution) {
        const isExercised =
          matchingExecution["Open/CloseIndicator"] === "C" &&
          Math.abs(convertToNumber(matchingExecution["TradePrice"])) === 0;
        return {
          ...execution?._doc,
          //update the records , after the api returns the updated response
          ...(isExercised && {
            isExercised: true,
          }),
          ...(isExercised && {
            closePrice: Math.abs(
              convertToNumber(matchingExecution["ClosePrice"])
            ),
          }),
        };
      }
      return;
    });

    // now group the executions by tradeId
    const grouped = _.groupBy(updatedExecutions.filter(Boolean), "tradeId");

    //now i want those records who has grouped executions length >=2
    const filteredGrouped = _.pickBy(grouped, (value) => value.length >= 2);

    // Object.entries(filteredGrouped).map(async ([tradeId, executions]) => {
    // ... code
    // });

    const promises = Object.entries(filteredGrouped).map(
      async ([tradeId, executions]) => {
        //get symbol

        // if trade not found , return it
        const trade = await Trade.findOne({ uuid: tradeId });
        if (!trade) {
          return;
        }
        //sort execution by date
        // const sortExecutionList = executions.sort(
        //   (a, b) => new Date(a.date) - new Date(b.date)
        // );
        const sortExecutionList = _.orderBy(executions, ["date"], ["asc"]);
        try {
          const calculationsResult =
            tradeType === "stocks"
              ? sortExecutionList[0].side === "buy"
                ? longCal(sortExecutionList)
                : shortCal(sortExecutionList)
              : sortExecutionList[0].side === "buy"
              ? optionsLongCal(sortExecutionList)
              : optionsShortCal(sortExecutionList);
          trade.wa = {
            grossPnl: calculationsResult.total_gross_profit_wa,
            netPnl: calculationsResult.total_net_profit_wa,
            netRoi: calculationsResult.roi_wa,
          };
          trade.fifo = {
            grossPnl: calculationsResult.total_gross_profit_fifo,
            netPnl: calculationsResult.total_net_profit_fifo,
            netRoi: calculationsResult.roi_fifo,
          };
          trade.adjustedCost = calculationsResult.adjusted_cost_total;
          trade.adjustedProceed = calculationsResult.adjusted_proceed_total;
          trade.entryPrice = calculationsResult.entry_price;
          trade.exitPrice = calculationsResult.exit_price;
          trade.avgEntryPrice = calculationsResult.average_entry;
          trade.avgExitPrice = calculationsResult.average_exit;
          trade.totalCommission = calculationsResult.total_commission;
          trade.currentPosition = calculationsResult.current_position;
          trade.openDate = calculationsResult.open_date;
          trade.side = calculationsResult.side;
          trade.totalQuantity = calculationsResult.total_quantity;
          if (calculationsResult.close_date) {
            trade.closeDate = calculationsResult.close_date;
          } else {
            trade.latestExecutionDate = sortExecutionList.at(-1)?.date;
          }
          if (calculationsResult.current_position === 0) {
            trade.status = "closed";
            // TODO: Confirm if result would be win or lose for 0 net pnl
            trade.result =
              trade?.calculationMethod === "fifo"
                ? calculationsResult.total_net_profit_fifo > 0
                  ? "win"
                  : "lose"
                : calculationsResult.total_net_profit_wa > 0
                ? "win"
                : "lose";
          } else {
            trade.status = "open";
            trade.result = "";
          }
          if (tradeType === "option") {
            trade.instrument = sortExecutionList?.[0]?.instrument;
            trade.strike = sortExecutionList?.[0]?.strike;
            trade.contractMultiplier =
              sortExecutionList?.[0]?.contractMultiplier;
            trade.expDate = sortExecutionList?.[0]?.expDate;
          }
          // **Option 1: If your ORM/DB supports bulk updates:**
          const bulkUpdateOperations = calculationsResult.executions.map(
            (exec, index) => ({
              updateOne: {
                filter: { uuid: exec.uuid },
                update: {
                  $set: {
                    ...exec,
                    currentPosition: exec.current_position,
                    wa: exec.wa,
                    fifo: exec.fifo,
                    index: +index + 1,
                  },
                },
              },
            })
          );

          await Executions.bulkWrite(bulkUpdateOperations);
          await trade.save();
          // Save the trade (either new or updated)
        } catch (err) {
          throw new Error(err);
        }
      }
    );

    await Promise.all(promises);
    console.log("Old records updated successfully.");
    return;
  } catch (error) {
    console.error("Error updating old records:", error);
  } finally {
  }
};

module.exports = updateOldRecord;
