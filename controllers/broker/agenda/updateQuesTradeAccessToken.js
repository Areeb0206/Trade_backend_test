const BrokerSync = require("../../../models/BrokerSync.model");
const Account = require("../../../models/Account.model");
const httpErrors = require("http-errors");

const User = require("../../../models/User.model");
const generateQuesTradeAPIToken = require("../../../services/brokerSync/QT/fetchQTToken/generateAPIToken");
const { emitSocketEvent } = require("../../../services/util/callApi.utils");
const updateQuesTradeAccessToken = async (req, res, next) => {
  const { userId, accountId, brokerId } = req.body;

  try {
    const user = await User.findOne({ uuid: userId });
    // if user is not subscribed then return
    if (user?.stripe?.subscriptionStatus === "inactive") {
      return res.status(200).json({
        success: true,
      });
    }
    const broker = await BrokerSync.findOne({ uuid: brokerId });
    const accountExist = await Account.findOne({ uuid: accountId });
    if (!accountExist) {
      throw httpErrors(404, "Account not found");
    }
    const authDetails = await generateQuesTradeAPIToken(
      broker?.details?.refresh_token
    );

    if (!authDetails?.access_token) {
      // If access token is not retrieved, update broker status
      await BrokerSync.findOneAndUpdate(
        { uuid: brokerId },
        {
          $set: {
            isDisconnected: true,
            error: "Failed to retrieve access token. Please reconnect.",
          },
        },
        { new: true }
      );
      return res.json({
        message: "Failed to retrieve access token. Please reconnect.",
        success: false,
      });
    }
    //update broker details with new access token
    await BrokerSync.findOneAndUpdate(
      { uuid: brokerId },
      {
        $set: {
          details: {
            ...broker?.details,
            ...authDetails,
            token: authDetails.refresh_token,
          },
          isDisconnected: false,
          error: null,
        },
      },
      { new: true }
    );

    res.json({
      message: "Syncing broker...",
      broker,
    });
  } catch (error) {
    // Check if the error is a known Questrade error
    // emit socket
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "syncing",
        // this id helps us to update the context state for a specific broker

        id: brokerId,
        // status is the status of the event
        status: "error",
        // error is the error message
        error: {
          message:
            error?.message ||
            "An error occurred while updating the access token.",
        },
      },
    });
    await BrokerSync.findOneAndUpdate(
      { uuid: brokerId },
      {
        $set: {
          // isDisconnected: true,
          status: "failed",
          error: error.message || "Unknown error occurred.",
        },
      },
      { new: true }
    );
    next(error);
  }
};

module.exports = updateQuesTradeAccessToken;
