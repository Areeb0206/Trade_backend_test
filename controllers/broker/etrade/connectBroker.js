const BrokerSyncModel = require("../../../models/BrokerSync.model");
const createAgenda =
  require("../../../services/util/callApi.utils").createAgenda;
const connectBroker = async (req, res, next) => {
  try {
    const { brokerId } = req.params;
    const { accountId } = req.body;
    const broker = await BrokerSyncModel.findOne({
      uuid: brokerId,
    });

    if (!broker) {
      throw new Error("Broker not found");
    }

    if (!broker?.details?.accessToken || !broker?.details?.accessTokenSecret) {
      throw new Error("Not authorized. Please visit /authorize first.");
    }
    const updatedBroker = await BrokerSyncModel.findOneAndUpdate(
      { uuid: brokerId },
      {
        $set: {
          "details.accountId": accountId,
          "details.isAuthorized": true,
          isDisconnected: false,
        },
      },
      {
        new: true,
      }
    );

    // create a job to sync data every 1 hour for  etrade
    await createAgenda({
      name: "Sync Broker Data",
      scheduleTime: "1 hour",
      data: updatedBroker,
      immediate: false,
    });
    res.status(200).json({
      message: "Broker connected successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = connectBroker;
