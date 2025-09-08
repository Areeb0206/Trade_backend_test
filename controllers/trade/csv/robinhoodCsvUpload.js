const formidable = require("formidable");
const _ = require("lodash");
const csv = require("csv-parser");
const fs = require("fs");
const saveTrades = require("../../../services/saveTrades");
const AccountModel = require("../../../models/Account.model");
const convertToNumber = require("../../../services/util/convertToNumber");
const crypto = require("crypto");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const uploadCsv = require("../../../services/uploadCsv");
const { getImportMessage } = require("../../../services/util/helper.utils");

function transformTrades(uniqueTrades) {
  const allOrderIds = [];

  const trades = uniqueTrades?.map((data) => {
    allOrderIds.push(data["orderId"]);
    // Description: "AAPL 7/11/2025 Call $210.00",

    const [symbol, expDate, instrument, strike] =
      data["Description"]?.split(" ") || [];
    const isOption = instrument && strike && expDate;
    const side = ["STO", "STC", "SELL"].includes(
      data["Trans Code"]?.toUpperCase()
    )
      ? "sell"
      : "buy";
    return {
      orderId: data["orderId"],
      assetClass: isOption ? "option" : "stocks",
      symbol: symbol?.toUpperCase(),
      date: data?.["Process Date"],
      quantity: Math.abs(convertToNumber(data["Quantity"])),
      price: Math.abs(convertToNumber(data["Price"])),
      commission: 0,
      currency: {
        code: "USD",
        name: "US Dollar",
      },
      side,
      contractMultiplier: isOption ? 100 : 1,
      ...(strike && {
        strike: Math.abs(convertToNumber(strike)),
      }),
      ...(expDate && {
        expDate: expDate,
      }),
      ...(instrument && {
        instrument: instrument.toLowerCase(),
      }),
    };
  });

  return {
    trades,
    allOrderIds,
  };
}
// Normalize row fields (trim & remove $)
const normalizeRow = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      (v || "").toString().replace(/\$/g, "").trim(),
    ])
  );

// Optional: SHA-256 ID if needed
const getRowHash = (row) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizeRow(row)))
    .digest("hex");

const robinhoodKeys = [
  "Activity Date",
  "Process Date",
  "Settle Date",
  "Instrument",
  "Description",
  "Trans Code",
  "Quantity",
  "Price",
  "Amount",
];
const robinhoodCsvUpload = async (req, res, next) => {
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

        const seen = new Set();
        const deduped = [];

        const normalizeRow = (row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
              k,
              (v || "").toString().replace(/\$/g, "").trim(),
            ])
          );

        for (const file of files?.csv || []) {
          try {
            await new Promise((resolve, reject) => {
              fs.createReadStream(file?.filepath || file?.path)
                .pipe(csv())
                .on("data", (row) => {
                  const transCode = row?.["Trans Code"]?.toUpperCase();
                  if (
                    !["STC", "BTC", "BTO", "STO", "BUY", "SELL"].includes(
                      transCode
                    )
                  )
                    return;

                  const normalized = normalizeRow(row);

                  // Validate required keys once per row
                  const missingKeys = robinhoodKeys.filter(
                    (key) => !(key in normalized)
                  );
                  if (missingKeys.length) {
                    reject(
                      new Error(
                        `Invalid CSV file: Missing keys: ${missingKeys.join(
                          ", "
                        )}`
                      )
                    );
                    return;
                  }

                  const key = JSON.stringify(normalized);
                  if (!seen.has(key)) {
                    seen.add(key);

                    // Optional: attach a orderId
                    row.orderId = getRowHash(row);

                    deduped.push(row);
                  }
                })
                .on("end", resolve)
                .on("error", reject);
            });
          } catch (error) {
            throw new Error(error?.message);
          }
        }

        // Now `deduped` contains all valid, unique records with optional _dedupId
        console.log("✅ Unique trades:", deduped.length);

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
        await uploadCsv({
          userId,
          accountId: account,
          brokerName,
          files,
        });
        const accountDetails = await AccountModel.findOne({
          uuid: account,
        });

        const { trades = [], allOrderIds = [] } = transformTrades(deduped);

        const { importedTrades, totalTrades, duplicateTrades } =
          await saveTrades({
            trades,
            account: accountDetails?._doc,
            allOrderIds,
            timeZone,
            brokerName,
            userId,
            importVia: "csv",
            isOrderIdString: true,
          });

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

module.exports = robinhoodCsvUpload;
