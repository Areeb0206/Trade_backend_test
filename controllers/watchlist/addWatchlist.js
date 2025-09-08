const Watchlist = require("../../models/Watchlist.model");
const { v4: uuid } = require("uuid");

const addWatchlist = async (req, res, next) => {
  const { uuid: user } = req.user;
  try {
    const { symbol, exchange } = req.body;
    const watchlist = new Watchlist({
      uuid: uuid(),
      symbol: symbol?.trim(),
      exchange: exchange?.trim(),
      user,
    });
    await watchlist.save();
    res.json({ message: "Watchlist added successfully", data: watchlist });
  } catch (error) {
    next(error);
  }
};

module.exports = addWatchlist;
