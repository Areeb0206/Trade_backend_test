const {
  etradeKeys: { apiKey, secretApiKey, callbackUrl },
  etrade: { baseUrl, authorizedUrl },
} = require("../../../config/keys");
const qs = require("querystring");
const crypto = require("crypto");

const requestTokenUrl = `${baseUrl}/oauth/request_token`;
const accessTokenUrl = `${baseUrl}/oauth/access_token`;
const authorizeUrl = authorizedUrl;
const accountListURL = `${baseUrl}/v1/accounts/list.json`;
const renewAccessTokenUrl = `${baseUrl}/oauth/renew_access_token`;
const getOrdersUrl = (accountIdKey) =>
  `${baseUrl}/v1/accounts/${accountIdKey}/orders`;

const getTransactionUrl = (accountIdKey) =>
  `${baseUrl}/v1/accounts/${accountIdKey}/transactions`;

// Application Credentials (from .env file)

// OAuth 1.0a Signature Function
function generateOAuthSignature(
  method,
  url,
  parameters,
  consumerSecret,
  tokenSecret = ""
) {
  const baseString = buildBaseString(method, url, parameters);
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;
  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

// Helper Functions for OAuth
function buildBaseString(method, url, parameters) {
  const encodedParameters = Object.keys(parameters)
    .sort()
    .reduce((obj, key) => {
      obj[key] = parameters[key];
      return obj;
    }, {});

  return `${method.toUpperCase()}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(qs.stringify(encodedParameters))}`;
}

function generateNonce() {
  return Math.random().toString(36).substring(2, 15);
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// Function to build the OAuth Authorization header
function buildAuthorizationHeader(parameters) {
  return (
    "OAuth " +
    Object.keys(parameters)
      .map((key) => `${key}="${encodeURIComponent(parameters[key])}"`)
      .join(", ")
  );
}

module.exports = {
  requestTokenUrl,
  accessTokenUrl,
  authorizeUrl,
  accountListURL,
  renewAccessTokenUrl,
  getOrdersUrl,
  consumerKey: apiKey,
  consumerSecret: secretApiKey,
  callbackUrl,
  generateOAuthSignature,
  buildBaseString,
  generateNonce,
  getTimestamp,
  buildAuthorizationHeader,
  getTransactionUrl,
};
