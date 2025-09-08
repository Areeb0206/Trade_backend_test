const PolygonOptionChain = require("../../../models/PolygonOptionChain.model");

const updateDelta = async (req, res, next) => {
  try {
    const { call, put, actualDelta } = req.body;
    const { id } = req.params;
    const data = await PolygonOptionChain.findOne({
      uuid: id,
    });
    if (!data) {
      throw new Error("Data not found");
    }

    const resp = await PolygonOptionChain.findOneAndUpdate(
      {
        uuid: id,
      },
      {
        $set: {
          "greeks.call": +call,
          "greeks.put": +put,
          "greeks.actualDelta": +actualDelta,
        },
      },
      {
        new: true,
      }
    );

    res.status(200).json({
      message: "Detail fetch successfully.",
      ...resp?._doc,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = updateDelta;
