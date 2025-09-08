const axios = require("axios");
const { quesTradeErrorList } = require("../../../../utils/QuestradeError");

const generateQuesTradeAPIToken = async (token) => {
  try {
    const response = await axios.get(
      `https://login.questrade.com/oauth2/token?grant_type=refresh_token&refresh_token=${token}`
    );

    return { ...response?.data };
  } catch (error) {
    const errorMessage =
      quesTradeErrorList[error?.response?.status]?.[
        error?.response?.data?.code || error?.response?.statusText
      ];
    throw new Error(errorMessage || "Failed to generate QuesTrade API token");
  }
};

module.exports = generateQuesTradeAPIToken;
