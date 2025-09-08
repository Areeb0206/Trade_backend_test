const BrokerSyncModel = require("../../../models/BrokerSync.model");
const fetchQuesTradeAccount = require("../../../services/brokerSync/QT/fetchQTToken/fetchQuesTradeAccount");
const generateQuesTradeAPIToken = require("../../../services/brokerSync/QT/fetchQTToken/generateAPIToken");
const { createAgenda } = require("../../../services/util/callApi.utils");
const { v4: uuid } = require("uuid");
const addQuesTradeBroker = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { accountName, accountId, broker, details } = req.body;

    const isBrokerExist = await BrokerSyncModel.findOne({
      accountId,
      "details.token": details?.token,
      "details.consumerKey": details?.consumerKey,
      "details.accountId": details?.accountId,
      userId,
    });

    if (isBrokerExist) {
      throw new Error(
        "Broker already exists for this user with the same token and consumer key."
      );
    }
    // Fetch the access token using the provided consumer key and token
    const authDetails = await generateQuesTradeAPIToken(details?.token);
    if (!authDetails?.access_token) {
      throw new Error("Failed to retrieve access token.");
    }
    // const accounts = await fetchQuesTradeAccount(
    //   authDetails.access_token,
    //   authDetails?.api_server
    // );
    // Create a new broker entry in the database
    const newBroker = new BrokerSyncModel({
      uuid: uuid(),
      userId,
      broker,
      details,
      status: "syncing",
      isDisconnected: false,
      accountName,
      accountId,
      broker,
      details: {
        ...details,
        ...authDetails,
      },
    });
    await newBroker.save();

    await createAgenda({
      name: "Sync Broker Data",
      scheduleTime: "1 hour",
      data: newBroker,
    });
    await createAgenda({
      name: "Update QuesTrade Access Token",
      // scheduleTime: "6 days",
      scheduleTime: "*/25 * * * *",
      // scheduleTime: "* * * * *",
      data: newBroker,
      skipImmediate: true,
    });
    res.json({
      message: "Authorization completed successfully.",
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = addQuesTradeBroker;
