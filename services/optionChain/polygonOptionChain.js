const { default: axios } = require("axios");
const { apiKey, snapShotUrl } =
  require("../../config/keys").polygon_option_chain;
const PolygonOptionChain = require("../../models/PolygonOptionChain.model");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
function getDirectionalStrike(price, previousClose, interval = 5) {
  if (price > previousClose) {
    // Bullish move → pick call-like strike (rounded up)
    return Math.ceil(price / interval) * interval;
  } else {
    // Bearish move → pick put-like strike (rounded down)
    return Math.floor(price / interval) * interval;
  }
}

async function fetchAllOptions(initialUrl) {
  let allResults = [];
  let url = initialUrl;

  while (url) {
    try {
      const response = await axios.get(url);
      const data = response?.data;

      if (data?.results?.length) {
        allResults.push(...data?.results);
      }

      url = data?.next_url ? `${data?.next_url}&apiKey=${apiKey}` : null;

      // Optional: Add rate limit delay if needed
      // await new Promise((res) => setTimeout(res, 100));
    } catch (error) {
      throw new Error(
        error?.response?.data?.error || error?.message || "Unknown error"
      );
    }
  }

  return allResults;
}

function groupOptionsByStrikeAndExpiration(data) {
  const grouped = {};

  for (const option of data) {
    const details = option?.details;

    if (!details) continue;

    const strike = details.strike_price;
    const expiry = details.expiration_date;

    if (strike == null || expiry == null) continue;

    const key = `${strike}|${expiry}`;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        strike_price: strike,
        expiration_date: expiry,
        call: {},
        put: {},
      };
    }

    const type = details.contract_type; // Directly use the contract_type from details

    if (type === "call") {
      grouped[key].call = option;
    } else if (type === "put") {
      grouped[key].put = option;
    }
  }

  return Object.values(grouped);
}

function calculateRange(price, percentage) {
  const percentageAmount = (percentage / 100) * price;
  const upperLimit = price + percentageAmount;
  const lowerLimit = price - percentageAmount;
  return `strike_price.gte=${lowerLimit}&strike_price.lte=${upperLimit}`;
}

function wait(ms) {
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}

const polygonOptionChain = async ({ userId, symbol, expiry }) => {
  wait(15000); // 15 seconds delay

  try {
    const optionChainUnifiedUrl = `${snapShotUrl}?ticker=${symbol}&limit=1&apiKey=${apiKey}`;
    const optionChainSnapshotUrl = `${snapShotUrl}/options/${symbol}?expiration_date=${expiry}&order=asc&limit=10&sort=ticker&apiKey=${apiKey}`;

    let [unifiedResponse, response] = await Promise.all([
      axios.get(optionChainUnifiedUrl),
      axios.get(optionChainSnapshotUrl),
    ]);

    //if the third party API is not responding, we are throwing an error
    if (!!unifiedResponse?.data?.results?.length === false) {
      throw new Error(
        "For the given date, option chain records are not available yet"
      );
    }
    if (!!response?.data?.results?.length === false) {
      throw new Error(
        "For the given date, option chain records are not available yet"
      );
    }
    unifiedResponse = unifiedResponse?.data?.results?.[0];

    const price = unifiedResponse?.value;
    const percentage = 5;

    const range = calculateRange(price, percentage);
    // here, we are fetching the option chain data from the third party API
    const url = `${snapShotUrl}/options/I:SPX?${range}&expiration_date=${expiry}&order=asc&limit=250&sort=strike_price&apiKey=${apiKey}`;

    // since we are getting the next_url from the response, we are fetching all the option chain data
    // by using the next_url
    const result = await fetchAllOptions(url);

    if (result?.length === 0) {
      throw new Error(
        "For the given date, option chain records are not available yet"
      );
    }
    const groupedOptions = groupOptionsByStrikeAndExpiration(result);

    // first update the option chain data if it is already present in the db
    // since we are fetching the option chain for the same date and future date
    // for future date, we don't have the closing price
    // so when the specified date comes, we will update the closing price

    const isOptionChainPresent = await PolygonOptionChain.findOne({
      user: userId,
      underlyingSymbol: symbol,
      expiry, // 19
    });

    if (isOptionChainPresent && expiry === dayjs()?.format("YYYY-MM-DD")) {
      // since if the expiry date is monday, we need to check the previous expiry date i.e. Friday
      //else we need to check the previous expiry date i.e. yesterday
      // const isFirstWeekday = dayjs().day() === 1; // Monday
      // let previousExpiryDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
      // if (isFirstWeekday) {
      //   previousExpiryDate = dayjs().subtract(3, "day").format("YYYY-MM-DD");
      // }

      // // here we are fetching the previous date option chain data to update the delta value
      // const fetchCurrentExpiryDetails = await PolygonOptionChain.findOne({
      //   user: userId,
      //   underlyingSymbol: symbol,
      //   expiry,
      // });

      //current date option chain strike price
      const strikePrice = getDirectionalStrike(
        unifiedResponse?.session?.close,
        unifiedResponse?.session?.previous_close
      );
      // here we are getting the delta value from the previous date option chain data
      const deltaValue = isOptionChainPresent?.data?.find(
        (item) => +item?.strike_price?.toFixed(0) === +strikePrice?.toFixed(0)
      );
      const greeks = {
        call: deltaValue?.call?.greeks?.delta,
        put: deltaValue?.put?.greeks?.delta,
        actualDelta:
          unifiedResponse?.session?.change_percent >= 0
            ? deltaValue?.call?.greeks?.delta
            : deltaValue?.put?.greeks?.delta,
      };

      // here we are updating the option chain data in the db
      await PolygonOptionChain.findOneAndUpdate(
        {
          user: userId,
          underlyingSymbol: symbol,
          expiry,
        },
        {
          $set: {
            closePrice: unifiedResponse?.value,
            session: unifiedResponse?.session,
            greeks,
            strike: strikePrice,
          },
        }
      );
    } else {
      // here we are creating the option chain data in the db
      await PolygonOptionChain.create({
        uuid: uuid(),
        user: userId,
        expiry,
        symbol: unifiedResponse?.ticker,
        underlyingSymbol: unifiedResponse?.ticker,
        closePrice: 0,
        name: unifiedResponse?.name,
        session: {
          change: 0,
          change_percent: 0,
          close: 0,
          high: 0,
          low: 0,
          open: 0,
          previous_close: 0,
        },
        data: groupedOptions,
        greeks: {
          call: 0,
          put: 0,
          actualDelta: 0,
        },
      });
    }

    return;
  } catch (error) {
    throw new Error(error?.message);
  }
};

module.exports = { polygonOptionChain };
