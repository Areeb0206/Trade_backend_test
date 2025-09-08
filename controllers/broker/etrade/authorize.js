const axios = require("axios");
const qs = require("querystring");
const {
  requestTokenUrl,
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  authorizeUrl,
} = require("../../../services/brokerSync/ETrade");
const httpErrors = require("http-errors");
const BrokerSyncModel = require("../../../models/BrokerSync.model");
const { v4: uuid } = require("uuid");
const etradeAuthorize = async (req, res, next) => {
  const { uuid: userId } = req.user;
  const { accountName, accountId, broker, details } = req.body;
  const oauthParameters = {
    oauth_nonce: generateNonce(),
    oauth_timestamp: getTimestamp(),
    oauth_consumer_key: details?.apiKey,
    oauth_callback: "oob",
    oauth_signature_method: "HMAC-SHA1",
  };
  const signature = generateOAuthSignature(
    "POST",
    requestTokenUrl,
    oauthParameters,
    details?.secretKey //consumerSecret
  );

  oauthParameters.oauth_signature = signature;

  const authHeader = buildAuthorizationHeader(oauthParameters);
  try {
    const response = await axios.post(requestTokenUrl, null, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log(response, "response");
    const isExist = await BrokerSyncModel.findOne({
      accountId,
      broker,
      userId,
    });

    if (isExist) {
      throw httpErrors.BadRequest("You have already synced this account");
    }

    const isBrokerSynced = await BrokerSyncModel.findOne({
      accountId,
    });
    if (isBrokerSynced) {
      throw httpErrors.BadRequest(
        "You already have an account with this token"
      );
    }
    const responseData = qs.parse(response.data);
    details.oauth_token = responseData.oauth_token;
    details.oauth_token_secret = responseData.oauth_token_secret;
    delete oauthParameters.signature;
    details.oauthParameters = oauthParameters;
    details.isAuthorized = false;
    const saveBroker = new BrokerSyncModel({
      uuid: uuid(),
      userId,
      accountName,
      accountId,
      broker,
      details,
      status: "failed",
      isDisconnected: true,
      error: "Authorization Pending. Please reconnect",
    });
    await saveBroker.save();

    const redirectUrl = `${authorizeUrl}?key=${details?.apiKey}&token=${responseData.oauth_token}`;
    console.log(redirectUrl, "redirectUrl");
    res.json({ url: redirectUrl });
    // res.redirectUrl(redirectUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = etradeAuthorize;
