const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const {
  getUtcStartEndDay,
} = require("../../services/util/dayjsHelperFunctions");
dayjs.extend(utc);
const searchBy = ({
  startDate,
  keyword,
  endDate,
  status,
  result,
  tradeType,
  tags,
  side,
  timeZone = "America/New_York",
  filterBy = "groupingDate",
  isDeleted = false,
  symbol,
}) => {
  const tzOffset = new Date().getTimezoneOffset();
  let searchCriteria = {};

  if (isDeleted === false) {
    searchCriteria = {
      ...searchCriteria,
      $or: [{ isDeleted: false }, { isDeleted: { $ne: true } }],
    };
  }
  if (isDeleted === true) {
    searchCriteria = { ...searchCriteria, isDeleted };
  }
  if (startDate && endDate) {
    const [startUtc, endUtc] = getUtcStartEndDay(startDate, endDate, timeZone);

    // startDate = dayjs(startDate)
    //   .utcOffset(tzOffset, true)
    //   .startOf("day")
    //   .toDate();
    startDate = startUtc?.toDate();
    // endDate = dayjs(endDate).utcOffset(tzOffset, true).endOf("day").toDate();
    endDate = endUtc?.toDate();
  }
  if (keyword) {
    searchCriteria["$or"] = [
      {
        tradeId: {
          $regex: `${keyword?.trim()}.*`,
          $options: "i",
        },
      },
      {
        symbol: {
          $regex: `${keyword?.trim()}.*`,
          $options: "i",
        },
      },
      {
        underlyingSymbol: {
          $regex: `${keyword?.trim()}.*`,
          $options: "i",
        },
      },
    ];
  }

  if (startDate && endDate && filterBy) {
    searchCriteria = {
      ...searchCriteria,
      [filterBy]: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  }

  if (status) {
    searchCriteria = { ...searchCriteria, status };
  }
  if (side) {
    searchCriteria = { ...searchCriteria, side };
  }
  if (result) {
    searchCriteria = { ...searchCriteria, result };
  }
  if (tradeType) {
    searchCriteria = { ...searchCriteria, tradeType };
  }
  if (tags?.length) {
    searchCriteria = {
      ...searchCriteria,
      tags: { $all: tags?.split(",") },
    };
  }
  if (symbol) {
    searchCriteria = {
      ...searchCriteria,
      $or: [{ symbol }, { underlyingSymbol: symbol }],
    };
  }
  return searchCriteria;
};
module.exports = { searchBy };
