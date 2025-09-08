const OptionChain = require("../../models/OptionChain.model");

const getList = async (req, res, next) => {
  try {
    const { expiry } = req.query;

    const data = await OptionChain.findOne({ expiry });

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getList;
