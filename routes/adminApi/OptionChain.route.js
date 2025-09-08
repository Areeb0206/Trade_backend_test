const router = require("express").Router();

// bring in models and controllers
const fetchOptionChain = require("../../adminController/optionChain/fetchOptionChain");
const fetchPolygonOptionChain = require("../../adminController/optionChain/polygon/fetchPolygonOptionChain");
const polygonOptionChainList = require("../../adminController/optionChain/polygon/polygonOptionChainList");
const polygonOptionChainDeltaValue = require("../../adminController/optionChain/polygon/polygonOptionChainDeltaValue");
const deltaValue = require("../../adminController/optionChain/deltaValue");
const getSpxPrice = require("../../adminController/optionChain/getSpxPrice");
const getList = require("../../adminController/optionChain/getList");
const deltaAnalysis = require("../../adminController/optionChain/polygon/deltaAnalysis");
const deltaStreak = require("../../adminController/optionChain/polygon/deltaStreak");
const updateDeltaValue = require("../../adminController/optionChain/polygon/updateDelta");

// get user details
router.get("/", getList);
router.get("/delta-value", deltaValue);

router.post("/", fetchOptionChain);
router.get("/spx-price", getSpxPrice);

// webhooks route
router.post("/polygon-option-chain", fetchPolygonOptionChain);
router.get("/polygon-option-chain/list", polygonOptionChainList);
router.get("/polygon-option-chain/delta-value", polygonOptionChainDeltaValue);
router.get("/polygon-option-chain/delta-analysis", deltaAnalysis);
router.get("/polygon-option-chain/delta-streak", deltaStreak);
router.put("/polygon-option-chain/delta/:id", updateDeltaValue);

module.exports = router;
