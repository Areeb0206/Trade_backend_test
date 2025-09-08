const UserModal = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const createError = require("http-errors");

const verifyOTP = async (req, res, next) => {
  try {
    const { token } = req.params;

    let buff = Buffer.from(token, "base64");
    let text = buff.toString("ascii");

    const [email, otp] = text.split(":");

    const verifyotp = await ResetPasswordModal.findOne({
      email,
      otp,
      isVerified: false,
    }).exec();
    if (!verifyotp) {
      throw createError.BadRequest("OTP is invalid or it may be expired!");
    }

    verifyotp.isVerified = true;
    await verifyotp.save();

    res.status(200).send({ message: "OTP verified successfully", email });
  } catch (error) {
    next(error);
  }
};

module.exports = verifyOTP;
