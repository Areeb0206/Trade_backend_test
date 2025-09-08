const dayjs = require("dayjs");
const moment = require("moment");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const advancedFormat = require("dayjs/plugin/advancedFormat");
const minMax = require("dayjs/plugin/minMax");

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(minMax);

// Define possible date formats (add more if needed based on your input data)
const possibleFormats = [
  "M/D/YYYY h:mm:ss A", // Format like "1/17/2024 1:10:38 PM"
  "M/D/YYYY h:mm:ss a", // Format like "1/17/2024 1:10:38 pm" (lowercase am/pm)
  "M/D/YYYY H:mm:ss", // Format like "1/17/2024 13:10:38" (24-hour format)
  "M/D/YYYY h:mm A", // Format like "1/17/2024 1:10 PM"

  "M/D/YYYY HH:mm:ss", // Format like "1/17/2024 13:10:38"
  "M/D/YYYY hh:mm:ss", // Format like "1/17/2024 01:10:38"
  "M/DD/YYYY HH:mm:ss", // Format like "01/17/2024 13:10:38"
  "M/DD/YYYY hh:mm:ss", // Format like "01/17/2024 01:10:38"

  "M/D/YY HH:mm:ss", // Format like "1/17/2024 13:10:38"
  "M/D/YY hh:mm:ss", // Format like "1/17/2024 01:10:38"
  "M/DD/YY HH:mm:ss", // Format like "01/17/2024 13:10:38"
  "M/DD/YY hh:mm:ss", // Format like "01/17/2024 01:10:38"

  "MM/DD/YYYY HH:mm:ss", // Format like "01/17/2024 13:10:38"
  "MM/DD/YYYY, HH:mm:ss A", // Format like "01/17/2024, 13:10:38 PM"
  "MM/DD/YYYY, hh:mm:ss A", // Format like "01/17/2024, 01:10:38 PM"
  "MM/DD/YYYY, hh:mm:ss", // Format like "01/17/2024, 01:10:38"
  "MM/DD/YYYY hh:mm:ss", // Format like "01/17/2024, 01:10:38"
  "MM/DD/YYYY HH:mm:ss", // Format like "01/17/2024, 01:10:38"
  // ... add other formats you might
];
const utcTimeToDate = ({ date, time, timeZone = "America/New_York" }) => {
  let newDate = `${date} ${time}`;
  const utcDateTime = dayjs.tz(newDate, timeZone).format();
  const utcDate = dayjs(utcDateTime).utc().toISOString();
  return utcDate;
};
const utcDate = ({ date, timeZone = "America/New_York" }) => {
  //  // Check if the input date is already in UTC format by detecting the 'Z' at the end of the string
  //  if (date.endsWith("Z")) {
  //   // Input is already in UTC format, return it as is
  //   return dayjs.utc(date).toISOString();
  // }

  const timeZoneDate = dayjs.tz(date, timeZone).format();

  const utcDate = dayjs(timeZoneDate).utc().toISOString();
  return utcDate;
};

function getStartOfThisMonth() {
  const now = dayjs().utc();
  const startOfMonth = now.startOf("month");
  const isoFormat = startOfMonth.format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  return isoFormat;
}

function formatDate(code) {
  // Assuming the format is YYYYMMDDHHmmSS
  let format = "YYYYMMDDHHmmss";
  if (code.length !== 14) {
    // If the length is not 14,
    format = "YYYYMMDDHmmss";
  }
  const date = moment(code, format);

  return {
    date: date.format("YYYY-MM-DD"),
    time: date.format("HH:mm:ss"),
  };
}
function convertToUtcExpiration(utcTimestamp, targetHour = 20) {
  // Convert to Dayjs object
  const utcDateTime = dayjs.utc(utcTimestamp);

  // Set the desired hour in UTC
  const expirationUtc = utcDateTime.hour(targetHour).minute(0).second(0);

  return expirationUtc.format();
}

const formatWebullDate = (date) => {
  const formattedDate = dayjs(date, "YYYY-MM-DD HH:mm:ss")?.toISOString();
  return formattedDate;
};
const formatEtradeCsvDate = (date) => {
  const formattedDate = dayjs(date, "YYYY-MM-DD HH:mm:ss")?.toISOString();
  return formattedDate;
};
const dateToFormattedString = (date) => {
  let formattedDate;
  for (const format of possibleFormats) {
    const parsedDate = dayjs(date, format, true); // Use strict parsing
    if (parsedDate.isValid()) {
      formattedDate = parsedDate.toISOString();
      break; // Stop looping if a valid format is found
    }
  }

  return formattedDate; // Returns ISO string or undefined if no format matched
};
function zerodhaParseOptionSymbol(symbol) {
  const regex = /([A-Z]+)(?:\d{2}[A-Z]{1,3})?(\d{2,3})(\d+)(CE|PE)/i; // Case-insensitive

  const match = symbol.match(regex);

  if (match) {
    const underlyingSymbol = match?.[1];
    const expiry = match?.[2];
    const strike = parseInt(match?.[3]);
    const instrument = match?.[4].toLowerCase() === "ce" ? "call" : "put";

    return {
      underlyingSymbol: underlyingSymbol,
      strike,
      instrument,
      expiry,
    };
  } else {
    return {
      underlyingSymbol,
      strike: 0,
      instrument: "",
      expiry: "",
    };
  }
}

function parseOptionSymbol(symbol) {
  const patterns = [
    // Format 1: BANKNIFTY2310543000CE (Expiry as digits and week)
    {
      regex: new RegExp("([A-Z]+)(\\d{2})(\\d{2})(\\d)(\\d+)(CE|PE)", "i"),
      formatName: "format1",
    },
    // Format 2: ICICIBANK23JAN890CE (Expiry as month abbreviation)
    {
      regex: new RegExp("([A-Z]+)(\\d{2}[A-Z]{3})(\\d+)(CE|PE)", "i"),
      formatName: "format2",
    },
    // Format 3: RELIANCE24FEB2600PE (Expiry as month abbreviation, different year)
    {
      regex: new RegExp("([A-Z]+)(\\d{2}[A-Z]{3})(\\d+)(CE|PE)", "i"),
      formatName: "format3",
    },
  ];

  for (const { regex, formatName } of patterns) {
    const match = symbol.match(regex);

    if (match) {
      try {
        let asset, expiryDate, strikePrice, optionType;

        if (formatName === "format1") {
          let year, month, week;
          [_, asset, year, month, week, strikePrice, optionType] = match;
          year = parseInt(year) + 2000; // Assuming 21st century
          month = parseInt(month);

          // Calculate approximate date (this is tricky, needs more sophisticated logic
          // for exact expiry date calculation based on weekly contracts)
          // Here we use just first day of the month
          expiryDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS
        } else if (formatName === "format2" || formatName === "format3") {
          let expiryStr;
          [_, asset, expiryStr, strikePrice, optionType] = match;
          expiryDate = parseDate(expiryStr); //Use helper function
        } else {
          return null; // Should not reach here, in case new pattern is introduced without logic
        }

        return {
          underlyingSymbol: asset,
          strike: parseInt(strikePrice),
          instrument: optionType?.toLowerCase() === "ce" ? "call" : "put",
        };
      } catch (error) {
        return {
          underlyingSymbol: asset,
          strike: 0,
          instrument: "",
        };
      }
    }
  }

  return null; // No format matched.
}

// Helper function to parse date
function parseDate(dateString) {
  const year = parseInt(dateString.substring(0, 2)) + 2000;
  const monthAbbr = dateString.substring(2, 5).toUpperCase();
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const monthIndex = monthNames.indexOf(monthAbbr);
  if (monthIndex === -1) {
    throw new Error("Invalid month abbreviation");
  }
  return new Date(year, monthIndex, 1); // Using 1st day of the month
}

function getUtcStartEndDay(startDate, endDate, timezoneStr) {
  /**
   * Converts start and end dates to UTC start and end of day for a specified timezone using dayjs.
   *
   * @param {Date|string|dayjs.Dayjs} startDate - Date object, date string (e.g., "2023-10-27"), or dayjs object representing the start date.
   * @param {Date|string|dayjs.Dayjs} endDate - Date object, date string, or dayjs object representing the end date.
   * @param {string} timezoneStr - String representing the timezone (e.g., "America/New_York", "Asia/Kolkata").
   *
   * @returns {[dayjs.Dayjs, dayjs.Dayjs] | [null, null]} - A tuple containing:
   *   - startOfDayUtc: dayjs object representing the start of the day in UTC.
   *   - endOfDayUtc: dayjs object representing the end of the day in UTC.
   *   Returns [null, null] if there's an error (invalid timezone, etc.).
   */
  try {
    // Convert inputs to dayjs objects, handling different input types
    const parsedStartDate = dayjs(startDate);
    const parsedEndDate = dayjs(endDate);

    // Validate the dates are valid
    if (!parsedStartDate.isValid() || !parsedEndDate.isValid()) {
      console.error("Invalid start or end date provided.");
      return [null, null];
    }

    // Localize dates to specified timezone
    const localizedStartDate = parsedStartDate.tz(timezoneStr);
    const localizedEndDate = parsedEndDate.tz(timezoneStr);

    // Calculate start and end of day in the localized timezone
    const startOfDayLocalized = localizedStartDate.startOf("day");
    const endOfDayLocalized = localizedEndDate.endOf("day");

    // Convert to UTC
    const startOfDayUtc = startOfDayLocalized.utc();
    const endOfDayUtc = endOfDayLocalized.utc();

    return [startOfDayUtc, endOfDayUtc];
  } catch (error) {
    return [null, null];
  }
}

function tosDateFormat(date, time) {
  const dateStr = date;
  const hours = time?.split(":")?.[0];
  const minutes = time?.split(":")?.[1];
  const seconds = time?.split(":")?.[2];
  let combinedDateTimeStr = new Date(dateStr);
  combinedDateTimeStr.setUTCHours(hours);
  combinedDateTimeStr.setUTCMinutes(minutes);
  combinedDateTimeStr.setUTCSeconds(seconds);
  const newDate = dayjs(combinedDateTimeStr).format("MM/DD/YYYY, HH:mm:ss A");

  return dateToFormattedString(newDate);
}

function getMonthlyDateRanges(startDate, endDate) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const ranges = [];
  let current = start.startOf("month");

  while (current.isBefore(end)) {
    const rangeStart = current.isBefore(start) ? start : current;
    const rangeEnd = current.endOf("month").isBefore(end)
      ? current.endOf("month")
      : end;

    ranges.push({
      start: rangeStart.endOf("day").toISOString(),
      end: rangeEnd.endOf("day").toISOString(),
    });

    current = current.add(1, "month").startOf("month");
  }

  return ranges;
}

// function getMonthlyDateRanges(startDate, endDate) {
//   const start = dayjs.utc(startDate);
//   const end = dayjs.utc(endDate);

//   const ranges = [];
//   let current = start.startOf("month");

//   while (current.isBefore(end)) {
//     const rangeStart = current.isBefore(start) ? start : current;
//     const rangeEnd = current.endOf("month").isBefore(end)
//       ? current.endOf("month")
//       : end;

//     ranges.push({
//       start: rangeStart.startOf("day").utc().toISOString(), // Modified start to be 00:00:00 UTC
//       end: rangeEnd.endOf("day").utc().toISOString(), // Modified end to be 23:59:59.999 UTC
//     });

//     current = current.add(1, "month").startOf("month");
//   }

//   return ranges;
// }
function getMonthlyDateRangesMin30Days(startDate, endDate) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const ranges = [];
  let currentStart = start;

  while (currentStart.isBefore(end)) {
    let currentEnd = currentStart.add(31, "day").endOf("day"); // 31 days window
    if (currentEnd.isAfter(end)) {
      currentEnd = end;
    }

    ranges.push({
      start: currentStart.toISOString(),
      end: currentEnd.toISOString(),
    });

    currentStart = currentEnd.add(1, "millisecond"); // no overlap
  }

  return ranges;
}

module.exports = {
  utcTimeToDate,
  utcDate,
  getStartOfThisMonth,
  formatDate,
  convertToUtcExpiration,
  formatWebullDate,
  formatEtradeCsvDate,
  dateToFormattedString,
  zerodhaParseOptionSymbol,
  parseOptionSymbol,
  getUtcStartEndDay,
  tosDateFormat,
  getMonthlyDateRanges,
  getMonthlyDateRangesMin30Days,
};
