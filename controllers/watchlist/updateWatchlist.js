const Watchlist = require("../../models/Watchlist.model");

const updateWatchlist = async (req, res, next) => {
  const { uuid: user } = req.user;
  try {
    const { id } = req.params;
    const { symbol, exchange } = req.body;
    let watchlist = await Watchlist.findOne({ uuid: id, user });
    if (!watchlist) {
      throw new Error("Watchlist not found");
    }

    watchlist = await Watchlist.findOneAndUpdate(
      { uuid: id },
      { symbol, exchange },
      { new: true }
    );
    res.json({ message: "Watchlist added successfully", watchlist });
  } catch (error) {
    next(error);
  }
};

module.exports = updateWatchlist;
