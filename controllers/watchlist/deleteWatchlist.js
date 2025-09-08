const Watchlist = require("../../models/Watchlist.model");

const deleteWatchlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    let watchlist = await Watchlist.findOne({ uuid: id });
    if (!watchlist) {
      throw new Error("Watchlist not found");
    }

    await Watchlist.findOneAndDelete({ uuid: id });

    res.json({ message: "Watchlist added successfully", id });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteWatchlist;
