const BrokerSyncModel = require("../../../models/BrokerSync.model");
const getAccessToken = require("../../../services/brokerSync/ETrade/access_token");
const etradeAccessToken = async (req, res, next) => {
  try {
    const { uuid: userId } = req.user;
    const { oauth_token, oauth_verifier: verifier } = req.query;

    const broker = await BrokerSyncModel.findOne({
      "details.oauth_token": oauth_token,
      userId,
    });

    // Verify the returned token matches
    if (oauth_token !== broker?.details?.oauth_token) {
      throw new Error("Invalid token. Please try again.");
    }
    // get the access token
    const responseData = await getAccessToken(broker, verifier);
    // update the access token in the database
    await BrokerSyncModel.updateOne(
      { uuid: broker?.uuid },
      {
        $set: {
          "details.accessToken": responseData?.oauth_token,
          "details.accessTokenSecret": responseData?.oauth_token_secret,
          "details.oauthParameters.oauth_verifier": verifier,
        },
      }
    );
    await BrokerSyncModel.updateMany(
      {
        broker: "eTrade",
        userId: broker?.userId,
      },
      {
        $set: {
          "details.accessToken": responseData?.oauth_token,
          "details.accessTokenSecret": responseData?.oauth_token_secret,
        },
      }
    );

    res.json({
      message: "Authorization completed successfully.",
      success: true,
      brokerId: broker.uuid,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = etradeAccessToken;
