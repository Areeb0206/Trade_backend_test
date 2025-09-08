const csv = require("csv-parser");
const fs = require("fs");
const { round } = require("lodash");

function generateUniqueId(entry) {
  let combinedString = "";
  for (const key in entry) {
    if (entry.hasOwnProperty(key)) {
      const cleanKey = key.replace(/[^a-zA-Z0-9]/g, ""); // Remove special characters from the key
      combinedString += cleanKey + entry[key]; // Concatenate clean key and value
    }
  }
  return combinedString.replace(/[^a-zA-Z0-9]/g, ""); //Remove special character to entire string
}

function mergeCashBalanceAndAccountHistory(cashBalance, accountHistory) {
  const mergedData = [];

  cashBalance.forEach((cashEntry) => {
    const cashEntrySide =
      cashEntry?.description?.split(" ")[0]?.trim() === "SOLD"
        ? "sell"
        : cashEntry?.description?.split(" ")[0]?.trim() === "BOT"
        ? "buy"
        : null;
    const cashEntryQuantity = +cashEntry?.description
      ?.split(" ")[1]
      ?.replaceAll(",", "")
      ?.trim();
    const cashEntryPrice = +cashEntry?.description
      ?.split(" ")[3]
      ?.replaceAll("@", "")
      ?.trim();
    const cashEntrySymbol = cashEntry?.description
      ?.split(" ")[2]
      ?.toLowerCase()
      ?.trim();
    if (!cashEntrySide) {
      return;
    }
    const matchingHistoryEntry = accountHistory.find(
      (historyEntry) =>
        cashEntry.date === historyEntry["exec time"]?.split(" ")[0] &&
        cashEntry.time === historyEntry["exec time"]?.split(" ")[1] &&
        cashEntrySide === historyEntry?.side?.trim()?.toLowerCase() &&
        +cashEntryQuantity === +historyEntry?.qty &&
        +round(cashEntryPrice, 2) === +round(historyEntry?.price, 2) &&
        cashEntrySymbol === historyEntry?.symbol?.toLowerCase()?.trim()
    );

    if (matchingHistoryEntry) {
      // Merge the entries, prioritizing cash balance info, then adding history details.
      const mergedEntry = {
        date: cashEntry.date,
        time: cashEntry.time,
        cashBalanceType: cashEntry.type, // Renamed type for clarity
        accountHistoryType: matchingHistoryEntry.type, //Renamed type for clarity
        ref: cashEntry["ref #"],
        description: cashEntry.description,
        miscFees: cashEntry["misc fees"],
        commissionsFees: cashEntry["commissions & fees"],
        amount: cashEntry.amount,
        balance: cashEntry.balance,
        spread: matchingHistoryEntry.spread,
        side: matchingHistoryEntry.side?.trim()?.toLowerCase(),
        qty: matchingHistoryEntry.qty,
        posEffect: matchingHistoryEntry["pos effect"],
        symbol: matchingHistoryEntry.symbol,
        exp: matchingHistoryEntry.exp,
        strike: matchingHistoryEntry.strike,
        price: matchingHistoryEntry.price,
        netPrice: matchingHistoryEntry["net price"],
        orderType: matchingHistoryEntry["order type"],
        uniqueId: generateUniqueId(cashEntry), // Generate unique ID for merged entry
      };
      mergedData.push(mergedEntry);
    } else {
      // If no matching history, keep the original cash balance entry.
      mergedData.push({
        date: cashEntry.date,
        time: cashEntry.time,
        cashBalanceType: cashEntry.type,
        ref: cashEntry["ref #"],
        description: cashEntry.description,
        miscFees: cashEntry["misc fees"],
        commissionsFees: cashEntry["commissions & fees"],
        amount: cashEntry.amount,
        balance: cashEntry.balance,
        uniqueId: generateUniqueId(cashEntry), // Generate unique ID for cash entry
      });
    }
  });

  // Add entries from accountHistory that don't have matching cash balance entries (if any exist).

  // accountHistory.forEach((historyEntry) => {
  //   const matchingCashEntry = cashBalance.find((cashEntry) =>
  //     cashEntry.date === historyEntry["exec time"]?.split(" ")[0] &&
  //     cashEntry.time === historyEntry["exec time"]?.split(" ")[1] &&
  //     cashEntry?.description?.split(" ")[0]?.trim() === "SOLD"
  //       ? "sell"
  //       : "buy" === historyEntry?.side?.trim()?.toLowerCase() &&
  //         +cashEntry?.description
  //           ?.split(" ")[1]
  //           ?.replaceAll(",", "")
  //           ?.trim() === +historyEntry.qty &&
  //         +cashEntry?.description
  //           ?.split(" ")[3]
  //           ?.replaceAll("@", "")
  //           ?.trim() === +historyEntry.price &&
  //         cashEntry?.description?.split(" ")[2]?.trim() ===
  //           historyEntry.symbol?.toLowerCase()?.trim()
  //   );

  //   if (!matchingCashEntry) {
  //     //This handles the case where only account history has that data.  You may not want this, but it's included for completeness
  //     mergedData.push({
  //       date: historyEntry["exec time"]?.split(" ")[0],
  //       time: historyEntry["exec time"]?.split(" ")[1],
  //       accountHistoryType: historyEntry.type,
  //       spread: historyEntry.spread,
  //       side: historyEntry.side,
  //       qty: historyEntry.qty,
  //       posEffect: historyEntry["pos effect"],
  //       symbol: historyEntry.symbol,
  //       exp: historyEntry.exp,
  //       strike: historyEntry.strike,
  //       price: historyEntry.price,
  //       netPrice: historyEntry["net price"],
  //       orderType: historyEntry["order type"],
  //     });
  //   }
  // });

  return mergedData;
}

// Optimized section parsing
function parseSectionOptimized(data, startIndex, stopKeywords, headers) {
  const records = [];
  if (!headers) return records;

  for (let i = startIndex + 1; i < data.length; i++) {
    const row = data[i];

    if (
      !row ||
      Object.keys(row).length === 0 ||
      stopKeywords.some((keyword) =>
        Object.values(row).some((value) => String(value).includes(keyword))
      )
    ) {
      break;
    }

    const record = {};
    for (const [headerKey, headerValue] of Object.entries(headers)) {
      const header = headerValue?.toLowerCase();
      if (header) {
        record[header] = row[headerKey] ?? ""; // Modified line
      }
    }
    records.push(record);
  }

  return records;
}

// Enhance cash balance entries with parsed datetime
function enrichCashBalance(entries) {
  return entries;
}

// Filter out non-trade rows in trade history
function filterTradeHistory(entries) {
  return entries.filter((entry) => {
    const execTime = entry["exec time"];
    if (execTime) {
      return true;
    }
    return false;
  });
}

// Function to parse CSV files using csv-parse
async function parseCSV(filePath, results) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

// Main function to extract data from one file
async function extractDataFromFile(filePath) {
  try {
    const csvData = [];
    await parseCSV(filePath, csvData);

    // Dynamically find the indices based on keywords.
    const cashBalanceHeaderIndex = csvData.findIndex((row) =>
      Object.values(row).some(
        (value) => typeof value === "string" && value.includes("Cash Balance")
      )
    );

    const accountHistoryHeaderIndex = csvData.findIndex((row) =>
      Object.values(row).some(
        (value) =>
          typeof value === "string" && value.includes("Account Trade History")
      )
    );

    const cashBalanceHeaders = csvData[cashBalanceHeaderIndex + 1];
    const accountHistoryHeaders = csvData[accountHistoryHeaderIndex + 1];

    const cashBalance =
      cashBalanceHeaderIndex !== -1
        ? enrichCashBalance(
            parseSectionOptimized(
              csvData,
              cashBalanceHeaderIndex + 1,
              ["Futures Statements", "Forex Statements"],
              cashBalanceHeaders
            )
          )
        : [];

    const accountHistory =
      accountHistoryHeaderIndex !== -1
        ? filterTradeHistory(
            parseSectionOptimized(
              csvData,
              accountHistoryHeaderIndex + 1,
              ["Profits and Losses"],
              accountHistoryHeaders
            )
          )
        : [];

    return mergeCashBalanceAndAccountHistory(cashBalance, accountHistory);
  } catch (error) {
    throw new Error(
      `Failed to extract data from ${filePath}: ${error.message}`
    );
  }
}

// Process multiple files concurrently
async function processMultipleFiles(files) {
  const promises = files.map(async (file) => {
    const filePath = file?.filepath || file?.path;
    if (!filePath) throw new Error("File path is missing.");
    return await extractDataFromFile(filePath);
  });
  const response = await Promise.all(promises);
  return response?.flat();
}

module.exports = { processMultipleFiles };
