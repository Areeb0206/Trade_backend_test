const axios = require("axios");
const {
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  renewAccessTokenUrl,
} = require(".");

const renewAccessToken = async (broker) => {
  try {
    //here we need to reconnect the broker and update the access token
    const oauthTokenSecret = broker?.details?.accessTokenSecret; // Renamed for clarity
    const oauthToken = broker?.details?.accessToken;

    const oauthParameters = {
      oauth_consumer_key: broker?.details?.apiKey,
      oauth_timestamp: getTimestamp(),
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_token: oauthToken,
    };

    const signature = generateOAuthSignature(
      "POST",
      renewAccessTokenUrl,
      oauthParameters,
      broker?.details?.secretKey,
      oauthTokenSecret
    );

    oauthParameters.oauth_signature = signature;

    const authHeader = buildAuthorizationHeader(oauthParameters);

    try {
      await axios.post(renewAccessTokenUrl, null, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return;
    } catch (error) {
      throw new Error(error?.response?.data);
    }
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = renewAccessToken;
