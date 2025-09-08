const formidable = require("formidable");
const _ = require("lodash");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const {
  tosDateFormat,
} = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const {
  processMultipleFiles,
} = require("../../../services/csvUpload/TOS/csv-parse");
const uploadCsv = require("../../../services/uploadCsv");
const { getImportMessage } = require("../../../services/util/helper.utils");

const tosKeys = [
  "date",
  "time",
  "type",
  "ref #",
  "description",
  "misc fees",
  "commissions & fees",
  "amount",
  "balance",
  "uniqueId",
];
const thinkorswimCsvUpload = async (req, res, next) => {
  try {
    const form = new formidable.IncomingForm();
    const { uuid: userId } = req.user;

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          next(err);
        }
        let { account, brokerName, timeZone } = fields;
        account = account?.[0];
        brokerName = brokerName?.[0];
        timeZone = timeZone?.[0];

        let results = [];

        // Process the CSV file
        try {
          results = await processMultipleFiles(files?.csv);
          console.log(results);
          // VALIDATE CSV data ( if you have expected columns)
          // if (!results.every((item) => tosKeys.every((key) => key in item))) {
          //   const missingKeys = tosKeys.filter(
          //     (key) => !results.every((item) => key in item)
          //   );
          //   throw new Error(
          //     `Invalid CSV file: Missing keys: ${missingKeys.join(", ")}`
          //   );
          // }
        } catch (error) {
          throw new Error(error?.message);
        }
        //remove duplicate trades
        const uniqueTrades = _.uniqBy(results, "uniqueId");

        // emit socket
        await emitSocketEvent({
          body: {
            //room Id
            room: userId,
            // key is the event name
            key: "csvUpload",
            // status is the status of the event
            status: "progress",
            // error is the error message
            error: null,
          },
        });

        res.status(200).json({
          message: "CSV fetched successfully",
        });
        //save the uploaded CSV details to the database
        await uploadCsv({
          userId,
          accountId: account,
          brokerName: brokerName,
          files,
        });
        const accountDetails = await AccountModel.findOne({
          uuid: account,
        });
        let allOrderIds = [];
        const trades = uniqueTrades?.map((item) => {
          const assetClass = ["put", "call"]?.includes(
            item?.accountHistoryType?.toLowerCase()
          )
            ? "option"
            : "stocks";

          const date = tosDateFormat(item?.date, item?.time);
          const orderId = item?.["uniqueId"];
          const symbol = item?.symbol?.toUpperCase();
          const quantity = item?.qty;
          const price = convertToNumber(item?.price);
          const commission =
            +item?.["commissionsFees"] || 0 + +item?.["miscFees"] || 0;
          const side = item?.side;
          allOrderIds.push(orderId);
          return {
            orderId,
            assetClass,
            symbol,
            date,
            quantity: Math.abs(quantity),
            price: Math.abs(_.round(+price, 5)),
            commission,
            side,
            currency: {
              code: "USD",
              name: "US Dollar",
            },
            ...(symbol && {
              underlyingSymbol: symbol,
            }),
            // ...(item?.["Strike"] && {
            //   strike: convertToNumber(item?.["Strike"]),
            //   contractMultiplier: 100,
            // }),
            // ...(item?.["Exp"] && {
            //   expiration: item?.["Exp"],
            // }),
            // ...(isExercised && {
            //   isExercised: true,
            // }),
            // ...(isExercised && {
            //   closePrice: convertToNumber(item?.["Price"]),
            // }),
            // ...(item?.["Type"] &&
            //   item?.Strike && {
            //     instrument: item?.["Type"]?.toLowerCase(),
            //   }),
          };
        });
        // ?.filter((i) => i?.symbol);

        // send results
        console.log(trades);

        // Save the trades
        const { importedTrades, totalTrades, duplicateTrades } =
          await saveTrades({
            trades,
            account: accountDetails?._doc,
            allOrderIds, // Remove if you don't generate order IDs anymore
            timeZone,
            brokerName,
            userId,
            importVia: "csv",
            isOrderIdString: true, // Adjust if order IDs are now different type
          });

        // Construct success message
        const successMessage = getImportMessage({
          importedTrades,
          totalTrades,
          duplicateTrades,
        });
        // emit socket
        await emitSocketEvent({
          body: {
            //room Id
            room: userId,
            // key is the event name
            key: "csvUpload",
            // status is the status of the event
            status: "uploaded",
            // error is the error message
            error: null,
            successMessage: successMessage.message,
          },
        });
      } catch (error) {
        const errorDetails = {
          message:
            error?.message || String(error) || "An unknown error occurred",
          stack: error?.stack || null, // Include this if you want to send stack trace
        };
        // emit socket
        await emitSocketEvent({
          body: {
            //room Id
            room: userId,
            // key is the event name
            key: "csvUpload",
            // status is the status of the event
            status: "error",
            error: errorDetails,
          },
        });
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = thinkorswimCsvUpload;
