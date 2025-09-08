const XLSX = require("xlsx");

// Convert Excel serial date to JavaScript Date
// function excelDateToJSDate(date) {
//   return new Date(Math.round((date - 25569) * 86400 * 1000));
// }
function excelDateToJSDate(serial) {
  var utc_days = Math.floor(serial - 25569);
  var utc_value = utc_days * 86400;
  var date_info = new Date(utc_value * 1000);

  var fractional_day = serial - Math.floor(serial) + 0.0000001;

  var total_seconds = Math.floor(86400 * fractional_day);

  var seconds = total_seconds % 60;

  total_seconds -= seconds;

  var hours = Math.floor(total_seconds / (60 * 60));
  var minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
    hours,
    minutes,
    seconds
  );
}

// Parse a section starting from a given index
function parseSection(data, startIndex, stopKeywords, headersOffset = 1) {
  const headers = data[startIndex + headersOffset] || [];
  const records = [];

  for (let i = startIndex + headersOffset + 1; i < data.length; i++) {
    const row = data[i];
    if (
      row.length === 0 ||
      stopKeywords.some((keyword) => row.includes(keyword))
    )
      break;

    const record = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]?.toLowerCase();
      if (header) record[header] = row[j] ?? "";
    }
    records.push(record);
  }

  return records;
}

// Enhance cash balance entries with parsed datetime
function enrichCashBalance(entries) {
  return entries.map((entry) => {
    const dateValue = entry["date"];
    const timeValue = entry["time"];

    if (dateValue && timeValue) {
      const dateObj = excelDateToJSDate(dateValue);
      if (dateObj instanceof Date && !isNaN(dateObj)) {
        const combined = `${dateObj.toLocaleDateString()} ${timeValue}`;
        const finalDate = new Date(combined);
        entry["datetime"] =
          finalDate instanceof Date && !isNaN(finalDate)
            ? finalDate.toLocaleString()
            : null;
      } else {
        entry["datetime"] = null;
      }
    } else {
      entry["datetime"] = null;
    }
    return entry;
  });
}

// Filter out non-trade rows in trade history
function filterTradeHistory(entries) {
  return entries.filter((entry) => {
    const execTime = entry["exec time"];
    if (typeof execTime === "number" && !isNaN(execTime)) {
      const dateObj = excelDateToJSDate(execTime);
      if (dateObj instanceof Date && !isNaN(dateObj)) {
        entry["datetime"] = dateObj.toLocaleString();
        return true;
      }
    }
    return false; // Skip description lines
  });
  return entries;
}

// Main function to extract data from one file
async function extractDataFromFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let cashBalanceStart = -1;
    let accountHistoryStart = -1;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row.includes("Cash Balance")) cashBalanceStart = i;
      if (row.includes("Account Trade History")) accountHistoryStart = i;
    }

    const cashBalance =
      cashBalanceStart !== -1
        ? enrichCashBalance(
            parseSection(jsonData, cashBalanceStart, [
              "Futures Statements",
              "Forex Statements",
            ])
          )
        : [];

    const accountHistory =
      accountHistoryStart !== -1
        ? filterTradeHistory(
            parseSection(jsonData, accountHistoryStart, [
              "Profits and Losses",
              "Net Liquidity Summary",
            ])
          )
        : [];

    return { cashBalance, accountHistory };
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

  return Promise.all(promises);
}

module.exports = { processMultipleFiles };
