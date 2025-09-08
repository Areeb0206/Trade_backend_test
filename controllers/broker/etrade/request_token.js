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
const requestToken = async (broker, id) => {
  try {
    //here we need to authorize the broker
    const oauthParameters = {
      oauth_nonce: generateNonce(),
      oauth_timestamp: getTimestamp(),
      oauth_consumer_key: broker?.details?.apiKey,
      oauth_callback: "oob",
      oauth_signature_method: "HMAC-SHA1",
    };
    const signature = generateOAuthSignature(
      "POST",
      requestTokenUrl,
      oauthParameters,
      broker?.details?.secretKey
    );

    oauthParameters.oauth_signature = signature;

    const authHeader = buildAuthorizationHeader(oauthParameters);
    const response = await axios.post(requestTokenUrl, null, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseData = qs.parse(response.data);
    delete oauthParameters.signature;
    // Update the request token and request token secret in the database
    await BrokerSyncModel.updateOne(
      { uuid: id },
      {
        $set: {
          "details.oauth_token": responseData.oauth_token,
          "details.oauth_token_secret": responseData.oauth_token_secret,
          "details.oauthParameters": oauthParameters,
        },
      }
    );
    const redirectUrl = `${authorizeUrl}?key=${broker?.details?.apiKey}&token=${responseData.oauth_token}`;
    return redirectUrl;
  } catch (error) {
    throw new Error(error?.response?.data);
  }
};

module.exports = requestToken;
