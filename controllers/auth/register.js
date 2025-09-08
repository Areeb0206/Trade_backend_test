const httpErrors = require("http-errors");
const { v4: uuid } = require("uuid");
const { sendEmail } = require("../../services/util/sendEmail");
const crypto = require("crypto");
const ProspectUser = require("../../models/ProspectUser.model");
const UserModel = require("../../models/User.model");
const invitationTemplate = require("../../utils/templates/invitation");
const { algorithm, initVector, securitykey, liveRedirectUrl, testRedirectUrl } =
  require("../../config/keys").emailverifyKey;
const { nodeEnv } = require("../../config/keys").environmental;

const Register = async (req, res, next) => {
  try {
    let { firstName, lastName, email, userHandle } = req.body;
    if (!email || !userHandle)
      throw httpErrors.BadRequest(
        "Both email and userName are required fields!"
      );
    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim().toLowerCase();
    userHandle = userHandle.trim().toLowerCase();

    // check if prospect user exists
    // const isUser = await ProspectUser.findOne({
    //   $or: [
    //     {
    //       email,
    //     },
    //     {
    //       userHandle,
    //     },
    //   ],
    // });

    // if (isUser) {
    //   throw new httpErrors.Conflict(
    //     "This email/username has already started the registration process. Please check your email for instructions!"
    //   );
    // }
    // check if email exists
    const checkIfEmailExist = await UserModel.findOne({
      email,
    });
    if (checkIfEmailExist) {
      throw new httpErrors.Conflict(
        "This email is already registered. Please try another one!"
      );
    }
    // check if user handle exists
    const isUserHandleExist = await UserModel.findOne({
      userHandle,
    });

    if (isUserHandleExist) {
      throw new httpErrors.Conflict(
        "This User Name is already taken. Please try another one!"
      );
    }

    const data = new ProspectUser({
      uuid: uuid(),
      firstName,
      lastName,
      email,
      userHandle,
    });
    const cipher = crypto.createCipheriv(algorithm, securitykey, initVector);

    // Encrypt the user id
    let encryptedUserid = cipher.update(data?.uuid.toString(), "utf-8", "hex");

    // Delete the token

    // Finalize the encryption
    encryptedUserid += cipher.final("hex");
    data.token = encryptedUserid;
    const url = nodeEnv === "test" ? testRedirectUrl : liveRedirectUrl;
    const redirectUrl = `${url}authentication/setup-password/${encryptedUserid}`;

    await sendEmail(
      [email],
      "Verify your email address - Tradelizer",
      invitationTemplate({
        url: redirectUrl,
        name: `${firstName} ${lastName}`,
      }),
      "noreply@tradelizer.com"
    );
    await data.save();

    res.status(200).json({
      message: "Registration email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = Register;
