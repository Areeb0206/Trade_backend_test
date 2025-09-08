const dayjs = require("dayjs");
const AccountModel = require("../../../models/Account.model");
const fetchQuesTradeData = require("../../../services/brokerSync/QT/fetchQTToken/fetchQuesTradeData");
const { quesTradeErrorList } = require("../../QuestradeError");
const _ = require("lodash");
const convertToNumber = require("../../../services/util/convertToNumber");
const saveTrades = require("../../../services/saveTrades");

const syncQT = async ({
  accessToken,
  apiServer,
  quesTradeAccount,
  broker,
  timeZone,
  startTime,
  endTime,
  tokenType,
  importVia = "brokerSync",
}) => {
  try {
    const res = await fetchQuesTradeData({
      accessToken,
      apiServer,
      quesTradeAccount,
      broker,
      importVia,
      timeZone,
      startTime,
      endTime,
      tokenType,
    });
    const account = await AccountModel.findOne({ uuid: broker?.accountId });

    const allOrderIds = [];
    const uniqueTrades = _.uniqBy(res, "orderId");

    const trades = uniqueTrades?.map((data) => {
      const date = dayjs(data?.tradeDate).format("YYYY-MM-DD");
      allOrderIds.push(data?.orderId);
      return {
        orderId: data?.orderId,
        assetClass: "option",
        symbol: data?.symbol,
        date,
        quantity: Math.abs(convertToNumber(data["quantity"])),
        price: Math.abs(convertToNumber(data["price"])),
        commission: Math.abs(convertToNumber(data["commission"])),
        currency: {
          code: "USD",
          name: "US Dollar",
        },
        side:
          data["action"] === "SHRT" ||
          data["action"] === "Sell" ||
          data["action"] === "STC" ||
          data["action"] === "STO"
            ? "sell"
            : "buy",

        // for options

        contractMultiplier: 1,
        // ...(data?.strike && {
        //   strike: Math.abs(convertToNumber(data?.strike)),
        // }),
        ...(data["settlementDate"] && {
          expDate: data?.settlementDate?.split("T")[0],
        }),
        ...(data["optionType"] && {
          instrument:
            data["optionType"]?.toLowerCase() === "put" ? "put" : "call",
        }),
      };
    });
    await saveTrades({
      trades,
      account: account?._doc,
      brokerName: broker?.broker,
      allOrderIds,
      importVia,
      timeZone,
      isOrderIdString: true,
      userId: broker?.userId,
    });
    return;
  } catch (error) {
    const errorMessage =
      error?.message ||
      quesTradeErrorList[error?.response?.status]?.[
        error?.response?.data?.code || error?.response?.statusText
      ];
    throw new Error(errorMessage || "Unknown error");
  }
};
module.exports = syncQT;
