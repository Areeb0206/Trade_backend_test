const axios = require("axios");
const {
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  accountListURL,
} = require(".");
const getAccounts = async (broker) => {
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
      const response = await axios.get(accountListURL, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

      return response;
    } catch (error) {
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = getAccounts;
