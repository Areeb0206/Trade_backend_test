const UserModal = require("../../models/User.model");
const ResetPasswordModal = require("../../models/ResetPassword.model");
const userLoginMech = require("../../models/UserLoginMech.model");
const bcrypt = require("bcryptjs");
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    // decode base64 token
    let buff = Buffer.from(token, "base64");
    let text = buff.toString("ascii");

    const [email, password] = text.split(":");

    const userLogin = await UserModal.findOne({
      email,
    });
    const otp = await ResetPasswordModal.findOne({
      email: email,
      isVerified: true,
    });
    if (!otp) {
      return res
        .status(400)
        .send({ message: "OTP is invalid or it may be expired!" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await userLoginMech.findOneAndUpdate(
      { user: userLogin?.uuid },
      { password: hashedPassword },
      {
        new: true,
      }
    );

    await ResetPasswordModal.findOneAndDelete({ email: email });

    res.status(200).send({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};
module.exports = resetPassword;
