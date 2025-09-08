const axios = require("axios");
const {
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  accountListURL,
} = require("../../../services/brokerSync/ETrade");
const BrokerSyncModel = require("../../../models/BrokerSync.model");
const getAccounts = require("../../../services/brokerSync/ETrade/get_accounts");
const accountList = async (req, res, next) => {
  try {
    const { brokerId } = req.params;
    const { uuid: userId } = req.user;
    const broker = await BrokerSyncModel.findOne({
      uuid: brokerId,
    });

    if (!broker) {
      throw new Error("Broker not found");
    }

    // if (!broker?.details?.accessToken || !broker?.details?.accessTokenSecret) {
    //   throw new Error("Not authorized. Please visit /authorize first.");
    // }
    //here we are finding the list of connected accounts for the broker
    const connectedBrokers = await BrokerSyncModel.find(
      {
        broker: "eTrade",
        "details.accountId": {
          $exists: true,
        },
        userId,
      },
      {
        "details.accountId": 1,
        _id: 0,
        isDisconnected: 1,
        "details.isAuthorized": 1,
      }
    );

    const connectedAccounts = connectedBrokers.map((account) =>
      account?.details?.accountId?.toString()
    );

    //fetch the accounts from the broker
    const response = await getAccounts(broker);

    res.json({
      // if any account is disconnected, we will mark it as isDisconnected
      data: response?.data?.AccountListResponse?.Accounts?.Account?.map((i) => {
        const brokerDetails = connectedBrokers.find(
          (j) => j.details.accountId === i.accountIdKey
        );
        return {
          ...i,
          isDisconnected: brokerDetails?.isDisconnected,
        };
      }),
      broker,
      connectedAccounts,
      connectedBrokers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = accountList;
