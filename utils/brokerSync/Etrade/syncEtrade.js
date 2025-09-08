const _ = require("lodash");
const AccountModel = require("../../../models/Account.model");
const getOrders = require("../../../services/brokerSync/ETrade/get_orders");
const renewAccessToken = require("../../../services/brokerSync/ETrade/renew_access_token");
const printOrders = require("../../../services/brokerSync/ETrade/printOrder");
const dayjs = require("dayjs");
const convertToNumber = require("../../../services/util/convertToNumber");
const saveTrades = require("../../../services/saveTrades");

const syncEtrade = async ({ broker, importVia, timeZone, fromDate }) => {
  try {
    const { apiKey, secretKey } = broker?.toObject()?.details;
    if (!apiKey || !secretKey) {
      throw new Error("API Key or Secret Key not found");
    }

    const account = await AccountModel.findOne({ uuid: broker?.accountId });
    if (!account) {
      throw new Error("Account not found");
    }
    // renew the token , every time before syncing the data
    await renewAccessToken(broker);
    console.log(fromDate, "fromDate");
    const res = await getOrders(broker, fromDate);
    const [data, allOrderIds] = printOrders(res);

    console.log(res, "formattedExecutions");

    // // // Save the executions using your existing saveTrades function
    // await saveTrades({
    //   trades: formattedExecutions,
    //   account: account?._doc,
    //   brokerName: broker?.broker,
    //   allOrderIds,
    //   importVia,
    //   timeZone,
    //   userId: broker?.userId,
    //   isOrderIdString: true,
    // });
    return;
  } catch (err) {
    throw err;
  }
};
module.exports = syncEtrade;
