const { default: axios } = require("axios");

const getSpxPrice = async (req, res, next) => {
  try {
    // const response = await axios.get(
    //   "https://www.cboe.com/tradable_products/sp_500/mini_spx_options/calculate/"
    // );
    res.json({
      data: {
        spx: {
          strike: 5670,
          expiry: "2025-04-02",
          putPremium: 0.3,
          callPremium: 2.2,
          currentPrice: 5670.9702,
          timestamp: "2025-04-02T16:14:59",
        },
        xsp: {
          strike: 567,
          expiry: "2025-04-02",
          putPremium: 0.01,
          callPremium: 0.02,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSpxPrice;
