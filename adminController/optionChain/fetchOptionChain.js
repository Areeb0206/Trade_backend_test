const { default: axios } = require("axios");
const Job = require("../../models/Job.model");
const OptionChain = require("../../models/OptionChain.model");
const {
  getOptionChainRecords,
} = require("../../services/optionChain/getOptionChainRecords");
const {
  emitSocketEvent,
  createAgenda,
} = require("../../services/util/callApi.utils");

const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(timezone);
dayjs.tz.setDefault("America/New_York");
dayjs.extend(utc);
const token = "MGZLb0llNWJqQTB1SU52UE9VSWd1b3JsQWd5MU5IbkZNUXcxd1Jua1NnQT0";

const fetchOptionChain = async (req, res, next) => {
  const { uuid: userId } = req.user;
  try {
    const { date, symbol } = req.body;
    if (!date || !symbol) {
      throw new Error("Please provide date and symbol");
    }

    let optionChain = await OptionChain.findOne({
      user: userId,
      date,
      underlyingSymbol: symbol,
    });

    if (!optionChain) {
      // const url = `https://api.marketdata.app/v1/options/chain/${symbol}/?strike=5000&side=call`;

      // const marketDataResponse = await axios.get(url, {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //   },
      // });
      // const marketDataExpiryDate = dayjs
      //   .unix(marketDataResponse?.data?.updated?.[0])
      //   .format("YYYY-MM-DD");
      // if (marketDataExpiryDate !== date) {
      //   throw new Error(
      //     "For the given date, option chain records are not available yet"
      //   );
      // }
      const response = await axios.get(
        "https://www.cboe.com/tradable_products/sp_500/mini_spx_options/calculate/"
      );
      if (response?.data?.spx?.expiry !== date) {
        throw new Error(
          "For the given date, option chain records are not available yet"
        );
      }

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
      optionChain = await OptionChain.create({
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

    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "option-chain",
        // status is the status of the event
        status: "progress",
        // error is the error message
        error: null,
      },
    });
    const jobs = await Job.findOne({ name: "Fetch Option Chain" });
    if (!jobs) {
      bypass = false;
      await createAgenda({
        name: "Fetch Option Chain",
        scheduleTime: "* 21 * * *",
        data: {
          userId,
          symbol,
        },
        skipImmediate: true,
      });
    }

    //delay
    res.json({});

    // if (bypass) {
    try {
      await getOptionChainRecords({ userId, symbol, date });
    } catch (error) {
      throw new Error(error.message);
    }
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "option-chain",
        // status is the status of the event
        status: "success",
        // error is the error message
        error: null,
      },
    });
    // }

    // emit socket

    console.log("Option chain fetched successfully");
    return;
  } catch (error) {
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "option-chain",
        // status is the status of the event
        status: "error",
        // error is the error message
        error: {
          message: error.message,
        },
      },
    });
    next(error);
  }
};

module.exports = fetchOptionChain;
