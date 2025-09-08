const httpErrors = require("http-errors");
const BrokerSyncModel = require("../../models/BrokerSync.model");
const { v4: uuid } = require("uuid");
const dayjs = require("dayjs");
const generateQuesTradeAPIToken = require("../../services/brokerSync/QT/fetchQTToken/generateAPIToken");
const { quesTradeErrorList } = require("../../utils/QuestradeError");
const updateToken = async (req, res, next) => {
  try {
    //broker uuid
    const { id } = req.params;
    let { reportId, flexToken, quesTradeRefreshToken, quesTradeAccountId } =
      req.body;
    const broker = await BrokerSyncModel.findOne({
      uuid: id,
    });
    if (!broker) {
      throw httpErrors(404, "Broker not found");
    }

    // for QuesTrade, we need to ensure that the refresh token is provided
    let authDetails = {};
    if (quesTradeRefreshToken) {
      authDetails = await generateQuesTradeAPIToken(quesTradeRefreshToken);
      if (!authDetails?.access_token) {
        throw new Error("Failed to retrieve access token.");
      }
    }

    await BrokerSyncModel.findOneAndUpdate(
      {
        uuid: id,
      },
      {
        $set: {
          ...(flexToken && {
            "details.flexToken": flexToken,
          }),
          ...(reportId && {
            "details.reportId": reportId,
          }),
          ...(broker?.broker === "quesTrade" && {
            details: {
              ...broker?.details,
              ...authDetails,
              token: authDetails.refresh_token,
              accountId: quesTradeAccountId || broker?.details?.accountId,
            },
          }),
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Fetched brokers successfully",
      data: broker,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateToken;
