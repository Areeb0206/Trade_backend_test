const Enquiry = require("../../models/Contact.model");

const updateSeenCount = async (req, res, next) => {
  try {
    await Enquiry.updateMany({}, { $set: { isSeen: true } });

    res.status(200).json({
      message: "Detail fetch successfully.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = updateSeenCount;
