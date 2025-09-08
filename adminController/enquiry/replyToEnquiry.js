const Enquiry = require("../../models/Contact.model");
const { sendEmail } = require("../../services/util/sendEmail");
const { ObjectId } = require("mongoose").Types;
const replyToEnquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipients, subject, template } = req.body;

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }
    const currentDate = Date.now();
    const replyData = {
      subject: subject,
      message: template,
      date: currentDate,
    };
    await Enquiry.findByIdAndUpdate(id, {
      $push: {
        reply: replyData,
      },
      $set: {
        isReplied: true,
      },
      lastReplied: currentDate,
    });
    await sendEmail([recipients], subject, template, "support@tradelizer.com", [
      "support@tradelizer.com",
    ]);
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = replyToEnquiry;
