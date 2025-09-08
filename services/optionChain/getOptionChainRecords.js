const { default: axios } = require("axios");
const dayjs = require("dayjs");
const OptionChain = require("../../models/OptionChain.model");
const { v4: uuid } = require("uuid");
const token = "MGZLb0llNWJqQTB1SU52UE9VSWd1b3JsQWd5MU5IbkZNUXcxd1Jua1NnQT0";

function calculatePriceRange(price, percentage) {
  const percentageAmount = (percentage / 100) * price;
  const upperLimit = price + percentageAmount;
  const lowerLimit = price - percentageAmount;

  return `${Math.floor(+lowerLimit)}-${Math.floor(+upperLimit)}`;
}

const getOptionChainRecords = async ({ userId, symbol, date }) => {
  try {
    // here we are checking if the option chain is available for the given date
    const getOptionFromDb = await OptionChain.findOne({
      user: userId,
      underlyingSymbol: symbol,
      date,
    });
    if (getOptionFromDb?.data?.length > 0) {
      return;
    }
    if (!getOptionFromDb) {
      //here we are checking if the option chain is available for the given date
      // const url = `https://api.marketdata.app/v1/options/chain/${symbol}/?strike=5000&side=call`;

      // const marketDataResponse = await axios.get(url, {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //   },
      // });
      // const marketDataExpiryDate = dayjs
      //   .unix(marketDataResponse?.data?.updated?.[0])
      //   .format("YYYY-MM-DD");
      // //here we are checking if the option chain is available for the given date

      //here we are fetching the SPX price from the third party API
      const response = await axios.get(
        "https://www.cboe.com/tradable_products/sp_500/mini_spx_options/calculate/"
      );

      //if the third party API is not responding, we are throwing an error
      if (
        !response?.data?.spx?.currentPrice ||
        !response?.data?.spx?.strike ||
        !response?.data?.spx?.expiry ||
        !response?.data?.spx?.timestamp
      ) {
        throw new Error(
          "Third party API is not responding. Contact support team"
        );
      }
      if (response?.data?.spx?.expiry !== date) {
        throw new Error(
          "For the given date, option chain records are not available yet"
        );
      }

      //if the option chain is not available in the database, we are creating a new record
      getOptionFromDb = await OptionChain.create({
        uuid: uuid(),
        user: userId,
        date,
        underlyingSymbol: symbol,
        closePrice: response?.data?.spx?.currentPrice,
        closeTime: response?.data?.spx?.timestamp,
        strike: response?.data?.spx?.strike,
        expiry: response?.data?.spx?.expiry,
      });
    }

    const price = getOptionFromDb?.closePrice;
    const percentage = 5;

    const range = calculatePriceRange(price, percentage);
    // here, we are fetching the option chain data from the third party API
    const url = `https://api.marketdata.app/v1/options/chain/${symbol}/?strike=${range}&expiration=${dayjs().format(
      "YYYY-MM-DD"
    )}`;
    let getOptionChain;
    try {
      getOptionChain = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      throw new Error(error?.response?.data?.s);
    }
    const numOptions = getOptionChain?.data?.strike?.length / 2;
    let data = [];

    // here the data is being formatted and pushed to the data array
    for (let i = 0; i < numOptions; i++) {
      const callIndex = i;
      const putIndex = i + numOptions;

      const res = {
        strike: getOptionChain?.data?.strike[callIndex], // or putIndex, they're the same
        iv: getOptionChain?.data?.iv[callIndex],
        call: {
          vega: getOptionChain?.data?.vega[callIndex],
          theta: getOptionChain?.data?.theta[callIndex],
          gamma: getOptionChain?.data?.gamma[callIndex],
          delta: getOptionChain?.data?.delta[callIndex],
          price: getOptionChain?.data?.last[callIndex],
          ask: getOptionChain?.data?.ask[callIndex],
          bid: getOptionChain?.data?.bid[callIndex],
        },
        put: {
          bid: getOptionChain?.data?.bid[putIndex],
          ask: getOptionChain?.data?.ask[putIndex],
          price: getOptionChain?.data?.last[putIndex],
          delta: getOptionChain?.data?.delta[putIndex],
          gamma: getOptionChain?.data?.gamma[putIndex],
          theta: getOptionChain?.data?.theta[putIndex],
          vega: getOptionChain?.data?.vega[putIndex],
        },
      };
      data.push(res);
    }

    // here we are updating the option chain data in the database
    await OptionChain.findOneAndUpdate(
      {
        user: userId,
        underlyingSymbol: symbol,
        date,
      },
      {
        $set: {
          expiration: new Date(date).getTime(),
        },
        $addToSet: {
          data,
        },
      },
      { new: true }
    );
    return;
  } catch (error) {
    throw new Error(error?.message);
  }
};

module.exports = { getOptionChainRecords };
