const Watchlist = require("../../models/Watchlist.model");

const getWatchlist = async (req, res, next) => {
  const { uuid: user } = req.user;
  const { start, limit, keyword } = req.query;
  let searchCriteria = {};
  if (keyword) {
    searchCriteria = {
      $or: [
        { exchange: { $regex: `${keyword}.*`, $options: "i" } },
        { symbol: { $regex: `${keyword}.*`, $options: "i" } },
      ],
    };
  }
  try {
    const [data] = await Watchlist.aggregate([
      {
        $match: {
          ...searchCriteria,
          user,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: parseInt(start || 0),
            },
            {
              $limit: parseInt(limit || 20),
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: data?.data || [],
      count: data?.count?.[0]?.count || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getWatchlist;
