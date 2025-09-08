const axios = require("axios");
const {
  generateOAuthSignature,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  getOrdersUrl,
} = require(".");
const xml2js = require("xml2js");
const dayjs = require("dayjs");

const getOrders = async (broker, fromDate) => {
  try {
    const ordersUrl = getOrdersUrl(broker?.details?.accountId);
    console.log(ordersUrl, "ordersUrl");
    const oauthParameters = {
      oauth_consumer_key: broker?.details?.apiKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: getTimestamp(),
      oauth_token: broker?.details?.accessToken,
    };

    // The latest date to include in the date range, formatted as MMDDYYYY. Both fromDate and toDate should be provided, toDate should be greater than fromDate.
    //  no	The earliest date to include in the date range, formatted as MMDDYYYY. History is available for two years. Both fromDate and toDate should be provided, toDate should be greater than fromDate.
    const params = {
      // securityType: "OPTN", not working for some reason
      // count: 1,
      // status: "OPEN",
      // transactionType: "BUY",
      fromDate,
      toDate: dayjs().format("MMDDYYYY"),
    };

    // **IMPORTANT: Combine OAuth params and query params BEFORE signing!**
    const allParams = { ...oauthParameters, ...params };

    const signature = generateOAuthSignature(
      "GET",
      ordersUrl,
      allParams, // Use ALL parameters for signature generation
      broker?.details?.secretKey,
      broker?.details?.accessTokenSecret
    );

    oauthParameters.oauth_signature = signature;

    const authHeader = buildAuthorizationHeader(oauthParameters);

    const requestOptions = {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      params: params, // Pass query parameters to axios
    };

    try {
      const response = await axios.get(ordersUrl, requestOptions);

      return response?.data;
    } catch (error) {
      const xmlString = error?.response?.data;
      xml2js.parseString(xmlString, { explicitArray: false }, (err, result) => {
        if (err) {
          console.error("Error parsing XML:", err);
          return;
        }

        throw result.Error.message === "oauth_problem=token_rejected"
          ? new Error("Token rejected, please reconnect")
          : new Error(result.Error.message);
      });
    }
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = getOrders;
