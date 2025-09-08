const axios = require("axios");
const {
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  accountListURL,
} = require(".");
const renewAccessToken = require("../../../controllers/broker/etrade/renew_access_token");
const checkTokenValidity = async ({ broker }) => {
  try {
    const oauthParameters = {
      oauth_consumer_key: broker?.details?.apiKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: getTimestamp(),
      oauth_token: broker?.details?.accessToken,
    };

    const signature = generateOAuthSignature(
      "GET",
      accountListURL,
      oauthParameters,
      broker?.details?.secretKey,
      broker?.details?.accessTokenSecret
    );
    oauthParameters.oauth_signature = signature;

    const authHeader = buildAuthorizationHeader(oauthParameters);
    try {
      await axios.get(accountListURL, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });
      return;
    } catch (error) {
      // renew access token if it is not valid
      return renewAccessToken(broker);
    }
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = checkTokenValidity;
