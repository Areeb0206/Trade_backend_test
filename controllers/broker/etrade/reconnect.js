const httpErrors = require("http-errors");
const BrokerSyncModel = require("../../../models/BrokerSync.model");
const requestToken = require("./request_token");
const renewAccessToken = require("../../../services/brokerSync/ETrade/renew_access_token");
const reconnect = async (req, res, next) => {
  try {
    const { id } = req.params;
    const broker = await BrokerSyncModel.findOne({ uuid: id });
    if (!broker) {
      throw new httpErrors.NotFound("Broker not found");
    }

    // if token is expired we will renew the token
    // isAuthorized means i am not authorized yet
    // isDisconnected means i am authorized but disconnected either by token expired or user disconnected
    if (broker?.details?.isAuthorized && broker?.isDisconnected) {
      await renewAccessToken(broker, id);
      await BrokerSyncModel.findOneAndUpdate(
        { uuid: id },
        {
          $set: {
            "details.isAuthorized": true,
            isDisconnected: false,
          },
        },
        {
          new: true,
        }
      );
      return res.json({ success: true });
    }
    // if broker is unauthorized and disconnected then we need to authorize the broker
    if (!broker?.details?.isAuthorized && broker?.isDisconnected) {
      //here we need to authorize the broker
      const redirectUrl = await requestToken(broker, id);
      return res.json({ url: redirectUrl });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = reconnect;
