const router = require("express").Router();

// bring in models and controllers
const generateSnapLink = require("../../controllers/broker/generateSnapLink");
// const listBrokerAccounts = require("../../controllers/snaptrade/listUserBrokerAccounts");
const accountCreateRedirect = require("../../controllers/snaptrade/accountCreateRedirect");
const reconnectBroker = require("../../controllers/snaptrade/reconnectBroker");
const updateDisconnectStatus = require("../../controllers/snaptrade/updateDisconnectStatus");
const addBroker = require("../../controllers/broker/addBroker");
const deleteBroker = require("../../controllers/broker/deleteBroker");
const getBrokers = require("../../controllers/broker/getBrokers");
const syncBroker = require("../../controllers/broker/syncBroker");
const updateToken = require("../../controllers/broker/updateToken");
const eTradeAuthorize = require("../../controllers/broker/etrade/authorize");
const reconnect = require("../../controllers/broker/etrade/reconnect");
const {
  connectMetaTraderAccount,
  fetchMetaTraderHistoryData,
} = require("../../controllers/broker/connectMetaTraderAccount");
const etradeAccessToken = require("../../controllers/broker/etrade/access_token");
const accountList = require("../../controllers/broker/etrade/account-list");
const connectBroker = require("../../controllers/broker/etrade/connectBroker");
const addQuesTradeBroker = require("../../controllers/broker/questrade/addQuesTradeBroker");

// get user details
router.post("/snap-link", generateSnapLink);
router.post("/reconnect-broker/:id", reconnectBroker);
router.put("/update-disconnect-broker-status/:id", updateDisconnectStatus);
// router.post("/snap/list-accounts", accountCreateRedirect);
router.post("/login-redirect", accountCreateRedirect);
// router.post("/snap/redirect", generateSnapLink);
router.post("/", addBroker);
router.delete("/:id", deleteBroker);
router.get("/", getBrokers);
router.get("/sync/:id", syncBroker);
router.put("/update-token/:id", updateToken);

//Metatrader
router.post("/connect-metatrader-account", connectMetaTraderAccount);
router.get("/metatrader-historical-data/:id", fetchMetaTraderHistoryData);

//quesTrade
router.post("/questrade/connect-broker-account", addQuesTradeBroker);

//E*Trade
router.post("/etrade/authorize", eTradeAuthorize);
router.post("/etrade/access-token", etradeAccessToken);
router.post("/etrade/reconnect/:id", reconnect);
router.get("/etrade/account-list/:brokerId", accountList);
router.post("/etrade/connect-broker-account/:brokerId", connectBroker);
module.exports = router;
