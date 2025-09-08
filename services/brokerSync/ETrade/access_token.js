const axios = require("axios");
const qs = require("querystring");
const {
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  accessTokenUrl,
} = require(".");
const getAccessToken = async (broker, verifier) => {
  try {
    const oauthParameters = {
      oauth_consumer_key: broker?.details?.apiKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: getTimestamp(),
      oauth_token: broker?.details?.oauth_token,
      oauth_verifier: verifier,
    };

    const signature = generateOAuthSignature(
      "POST",
      accessTokenUrl,
      oauthParameters,
      broker?.details?.secretKey,
      broker?.details?.oauth_token_secret
    );
    oauthParameters.oauth_signature = signature;

    const authHeader = buildAuthorizationHeader(oauthParameters);

    try {
      const response = await axios.post(accessTokenUrl, null, {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const responseData = qs.parse(response.data);
      return responseData;
    } catch (error) {
      // console.error("Error getting access token:", error.response.data);
      // res.status(500).send("Error completing authorization.");
      throw error.response.data;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = getAccessToken;
