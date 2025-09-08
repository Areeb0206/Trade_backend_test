const { default: axios } = require("axios");
const { apiKey, snapShotUrl } =
  require("../../../config/keys").polygon_option_chain;
const Job = require("../../../models/Job.model");
const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");
const {
  emitSocketEvent,
  createAgenda,
} = require("../../../services/util/callApi.utils");

const { v4: uuid } = require("uuid");
const {
  polygonOptionChain,
} = require("../../../services/optionChain/polygonOptionChain");
const dayjs = require("dayjs");
// const dayjs = require("dayjs");
// const utc = require("dayjs/plugin/utc");
// const timezone = require("dayjs/plugin/timezone");
// dayjs.extend(timezone);
// dayjs.tz.setDefault("America/New_York");
// dayjs.extend(utc);
const fetchPolygonOptionChain = async (req, res, next) => {
  const { uuid: userId } = req.user;
  try {
    const { expiry, symbol = "I:SPX" } = req.body;
    if (!expiry || !symbol) {
      throw new Error("Please provide date and symbol");
    }

    let optionChain = await PolygonOptionChain.findOne({
      user: userId,
      expiry,
      underlyingSymbol: symbol,
    });
    let unifiedResponse;
    if (!optionChain) {
      // const optionChainUnifiedUrl = `${snapShotUrl}?ticker=${symbol}&limit=1&apiKey=${apiKey}`;
      // // const optionChainSnapshotUrl = `https://api.polygon.io/v3/snapshot/options/${symbol}?strike_price=5700&expiration_date=2025-05-02&order=asc&limit=10&sort=ticker&apiKey=rgy4s6FCPdwB3trLIs2vK9v0FH9wU0ld`;
      // try {
      //   unifiedResponse = await axios.get(optionChainUnifiedUrl);
      // } catch (e) {
      //   console.log(e);
      // }
      // if (
      //   !unifiedResponse?.data &&
      //   !!unifiedResponse?.data?.results?.length === false
      // ) {
      //   throw new Error(
      //     "For the given date, option chain records are not available yet"
      //   );
      // }
      if (expiry !== dayjs().format("YYYY-MM-DD")) {
        throw new Error(
          "For the given date, option chain records are not available yet"
        );
      }
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
    const jobs = await Job.findOne({ name: "Polygon Option Chain" });
    if (!jobs) {
      const promise = [16]?.map((i) => {
        return createAgenda({
          name: "Polygon Option Chain",
          scheduleTime: `${i} 20 * * 1-5`,
          data: {
            userId,
            symbol,
          },
          skipImmediate: true,
        });
      });
      await Promise.all(promise);

      // await createAgenda({
      //   name: "Polygon Option Chain",
      //   scheduleTime: "15 20 * * 1-5",
      //   data: {
      //     userId,
      //     symbol,
      //   },
      //   skipImmediate: true,
      // });
    }

    res.json({});

    // try {
    //   await polygonOptionChain({ userId, symbol, expiry });
    // } catch (error) {
    //   throw new Error(error.message);
    // }
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

module.exports = fetchPolygonOptionChain;
