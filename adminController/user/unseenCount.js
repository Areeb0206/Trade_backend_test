const CancelReason = require("../../models/CancelReason.model");

const unseenCount = async (req, res, next) => {
  try {
    const count = await CancelReason.countDocuments({ isSeen: false });

    res.status(200).json({
      data: count,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = unseenCount;
