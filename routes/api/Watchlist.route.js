const router = require("express").Router();

const addWatchlist = require("../../controllers/watchlist/addWatchlist");
const getWatchlist = require("../../controllers/watchlist/getWatchlist");
const deleteWatchlist = require("../../controllers/watchlist/deleteWatchlist");
const updateWatchlist = require("../../controllers/watchlist/updateWatchlist");

router.post("/", addWatchlist);
router.get("/", getWatchlist);
router.delete("/:id", deleteWatchlist);
router.put("/:id", updateWatchlist);

module.exports = router;
