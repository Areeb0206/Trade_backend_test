const Trade = require("../../models/Trade.model");

const getSymbolList = async (req, res, next) => {
  try {
    const { accountIds } = req.query;
    const data = await Trade.aggregate([
      {
        $match: {
          $or: [
            { isDeleted: false },
            { isDeleted: { $exists: false } },
            { isDeleted: { $ne: "" } },
          ],
          accountId: { $in: accountIds.split(",") },
        },
      },
      {
        $set: {
          symbol: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$underlyingSymbol", null] },
                  { $eq: ["$underlyingSymbol", ""] },
                  { $eq: [{ $type: "$underlyingSymbol" }, "missing"] },
                ],
              },
              then: "$symbol",
              else: "$underlyingSymbol",
            },
          },
        },
      },
      {
        $group: {
          _id: "$symbol",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          symbol: "$_id",
        },
      },
    ]);
    res.json({
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getSymbolList;
