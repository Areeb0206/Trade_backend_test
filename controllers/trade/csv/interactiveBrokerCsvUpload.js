const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const { getSocket } = require("../../../utils/socket/io.utils");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const { formatDate } = require("../../../services/util/dayjsHelperFunctions");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const uploadCsv = require("../../../services/uploadCsv");
const { getImportMessage } = require("../../../services/util/helper.utils");

// "DateTime",
// "Symbol",
// "AssetClass",
// "TradeID",
// "IBCommission",
// "Quantity",
// "TradePrice",
// "Buy/Sell",
// "Open/CloseIndicator",
// "Buy/Sell",
// "UnderlyingSymbol",
// // "Multiplier",
// "Strike",
// "Expiry",
// "Put/Call",
// "ClosePrice",

// //for futures
// "Date/Time",
// "Commission",
// "Price",
// "Multiplier",
const IBKeys = [
  ["DateTime", "Date/Time"], // Date/Time information
  ["IBCommission", "Commission"], // Commission information
  ["TradePrice", "Price"], // Price information
  // ["Open/CloseIndicator", ""], // Open/Close information
  // ["ClosePrice", ""], // Close Price information
  ["Symbol"], // Symbol (Mandatory)
  ["AssetClass"], // Asset Class (Mandatory)
  ["TradeID"], // Trade ID (Mandatory)
  ["Quantity"], // Quantity (Mandatory)
  ["Buy/Sell"], // Buy/Sell (Mandatory)
  ["UnderlyingSymbol"], // Underlying Symbol (Mandatory)
  // Add other mandatory ones if they are truly mandatory for ALL rows
  ["Strike"], // Mandatory for options?
  ["Expiry"], // Mandatory for options?
  ["Put/Call"], // Mandatory for options?
  ["Multiplier"], // Mandatory for futures?
];
// datetime, ibcommission, tradeprice, open / closeindicator, closeprice;
function validateCSVKeys(csvHeaders, requiredKeyGroups) {
  // 1. Lowercase headers for case-insensitive comparison
  const lowerCaseHeaders =
    csvHeaders?.map((header) => header?.toLowerCase()) || [];

  const missingKeyGroups = [];

  // 2. Iterate through each group of required keys
  for (const group of requiredKeyGroups) {
    let foundInGroup = false;
    const lowerCaseGroup = group.map((key) => key?.toLowerCase());

    // 3. Check if at least one key from the group is present in headers
    for (const key of lowerCaseGroup) {
      if (lowerCaseHeaders.includes(key)) {
        foundInGroup = true;
        break; // Found one, move to the next group
      }
    }

    // 4. If no key from the group was found, add the group to missing
    if (!foundInGroup) {
      // Add the original key group or a descriptive string
      // Listing the alternatives is more helpful in the error message.
      missingKeyGroups.push(group.join(" or "));
    }
  }

  // 5. Throw error if any group is missing
  if (missingKeyGroups.length > 0) {
    throw new Error(
      `Invalid CSV file: Missing required information. Expected one of the following groups of keys: ${missingKeyGroups.join(
        ", "
      )}`
    );
  }

  // 6. Return true if all required groups are present
  return true;
}
const interactiveBrokerCsvUpload = async (req, res, next) => {
  try {
    const io = getSocket();
    const form = new formidable.IncomingForm();
    const { uuid: userId } = req.user;

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          next(err);
        }
        const { account, brokerName, timeZone } = fields;

        let results = [];
        let csvHeaders = [];

        //check if the file is in correct format
        for (const file of files?.csv || []) {
          try {
            const data = await new Promise((resolve, reject) => {
              const stream = fs
                .createReadStream(file?.filepath || file?.path)
                .pipe(csv());

              stream.on("headers", (headers) => csvHeaders.push(...headers));
              stream.on("data", (data) => results.push(data));
              stream.on("end", () => resolve(results));
              stream.on("error", (error) => reject(error));
            });

            // Validate CSV data
            // if (!data.every((item) => IBKeys.every((key) => key in item))) {
            //   const missingKeys = IBKeys.filter(
            //     (key) => !data.every((item) => key in item)
            //   );
            //   throw new Error(
            //     `Invalid CSV file: Missing keys: ${missingKeys.join(", ")}`
            //   );
            // }
            const isValid = validateCSVKeys(csvHeaders, IBKeys);
            if (!isValid) {
              throw new Error(
                `Invalid CSV file: Missing keys: ${IBKeys.join(", ")}`
              );
            }
          } catch (error) {
            throw new Error(error?.message);
          }
        }

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

        // Save the uploaded CSV details to the database
        await uploadCsv({
          userId,
          accountId: account?.[0],
          brokerName: brokerName?.[0],
          files,
        });
        const accountDetails = await AccountModel.findOne({
          uuid: account?.[0],
        });
        const uniqueTrades = _.uniqBy(results, "TradeID");

        let allOrderIds = [];
        const trades = uniqueTrades?.map((data) => {
          const sanitizedFormat = (data?.["DateTime"] || data?.["Date/Time"])
            .replaceAll(",", "")
            .replaceAll(":", "")
            .replaceAll(" ", "")
            .replaceAll(";", "")
            .replaceAll("/", "")
            .replaceAll("-", "");

          const { date, time } = formatDate(sanitizedFormat);

          const newDate = `${date} ${time}`;

          allOrderIds.push(convertToNumber(data["TradeID"]));
          const isExercised =
            data["Open/CloseIndicator"] === "C" &&
            Math.abs(convertToNumber(data["TradePrice"])) === 0;
          return {
            orderId: convertToNumber(data["TradeID"])?.toString()?.trim(),
            assetClass:
              data["AssetClass"] === "OPT"
                ? "option"
                : data["AssetClass"] === "STK"
                ? "stocks"
                : data["AssetClass"] === "FUT"
                ? "future"
                : "",
            symbol: data["Symbol"],
            date: newDate,
            quantity: Math.abs(convertToNumber(data["Quantity"])),
            price: Math.abs(
              convertToNumber(data["TradePrice"] || data["Price"])
            ),
            commission: Math.abs(
              convertToNumber(data["IBCommission"] || data["Commission"])
            ),
            side: data["Buy/Sell"]?.toLowerCase(),
            currency: {
              code: "USD",
              name: "US Dollar",
            },
            // for options
            ...(data["UnderlyingSymbol"] && {
              underlyingSymbol: data["UnderlyingSymbol"],
            }),
            ...(data["Multiplier"] && {
              contractMultiplier: convertToNumber(data["Multiplier"]),
            }),
            ...(data["Strike"] && {
              strike: Math.abs(convertToNumber(data["Strike"])),
            }),
            ...(data["Expiry"] && {
              // expDate: utcDate({ date: data["Expiry"] }),
              expDate: data["Expiry"],
            }),
            ...(isExercised && {
              isExercised: true,
            }),
            ...(isExercised && {
              closePrice: Math.abs(convertToNumber(data["ClosePrice"])),
            }),
            ...(data["Put/Call"] && {
              instrument:
                data["Put/Call"]?.toLowerCase() === "p" ? "put" : "call",
            }),
          };
        });

        const { importedTrades, totalTrades, duplicateTrades } =
          await saveTrades({
            trades,
            account: accountDetails?._doc,
            allOrderIds,
            timeZone: timeZone?.[0],
            brokerName: brokerName?.[0],
            userId,
            importVia: "csv",
          });

        // Prepare success message
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

module.exports = interactiveBrokerCsvUpload;
