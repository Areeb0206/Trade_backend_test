const User = require("../../models/User.model");
const uploadBase64File = require("../../services/util/upload-base64-file");

const updateProfile = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      userHandle,
      profile,
      timeZone,
      removeImage,
    } = req.body;
    const { uuid: userId } = req.user;

    if (userHandle) {
      const userData = await User.findOne({
        userHandle: userHandle.toLowerCase(),
      });
      if (userData) {
        throw new Error("User Name already exists");
      }
    }
    if (email) {
      const userData = await User.findOne({ email });
      if (userData) {
        throw new Error("Email already exists");
      }
    }
    let profileImage;
    if (profile?.base64) {
      profileImage = await uploadBase64File(profile, "profile");
    }
    const user = await User.findOneAndUpdate(
      {
        uuid: userId,
      },
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email: email.toLowerCase() }),
        ...(userHandle && { userHandle: userHandle.toLowerCase() }),
        ...(profileImage?.Location && { profileImage: profileImage.Location }),
        ...(timeZone && { timeZone }),
        ...(removeImage === true && { profileImage: "" }),
      },
      { new: true }
    );
    res.json({
      message: "Updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateProfile;
