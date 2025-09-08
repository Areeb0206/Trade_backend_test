const { create } = require("lodash");
const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");

const polygonOptionChainList = async (req, res, next) => {
  try {
    const { expiry } = req.query;

    const data = await PolygonOptionChain.findOne({ expiry });

    res.json({
      message: "Fetched successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = polygonOptionChainList;
