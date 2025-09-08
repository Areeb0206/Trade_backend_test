const UserModal = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const { sendEmail } = require("../../services/util/sendEmail");
const crypto = require("crypto");
const createError = require("http-errors");

const sendOTP = require("../../utils/templates/send-otp");
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await UserModal.findOne({ email });

    if (!user) {
      throw createError.BadRequest("This Email is not registered");
    }
    await ResetPasswordModal.findOneAndDelete({ email: email });

    const otp = crypto.randomInt(1000, 9999);
    const resetOtp = new ResetPasswordModal({
      otp,
      email,
    });
    await resetOtp.save();
    await sendEmail(
      [email],
      `ONE TIME PASSWORD (OTP) - CONFIRMATION`,
      sendOTP({ otp }),
      "noreply@tradelizer.com"
    );

    return res.status(200).send({ message: "OTP sent successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = forgotPassword;
