const Enquiry = require("../../models/Contact.model");

const unseenCount = async (req, res, next) => {
  try {
    const count = await Enquiry.countDocuments({ isSeen: false });

    res.status(200).json({
      data: count,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = unseenCount;
