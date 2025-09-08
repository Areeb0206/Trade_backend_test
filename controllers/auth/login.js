const { comparePassword } = require("../../helpers/bcrypt");
const { generateAccessToken } = require("../../services/util/generate_token");
const { generateRefreshToken } = require("../../services/util/generate_token");
const Token = require("../../models/Token.model");
const User = require("../../models/User.model");
const UserLoginMech = require("../../models/UserLoginMech.model");
const createHttpError = require("http-errors");

/**
 * Login for existing users
 *
 * @author Surya Pratap
 * @since 8 Jul 2023
 */
const login = async (req, res, next) => {
  try {
    let { email, password } = req.body;
    email = email.trim().toLowerCase();

    // check if carrier exists
    const userLogin = await User.findOne({
      email,
    });
    if (!userLogin)
      throw new createHttpError.BadRequest(
        "Account not found. Please sign up."
      );

    const isActive = userLogin.isActive;
    if (!isActive) {
      throw new createHttpError.BadRequest(
        "Account not active. Please contact support."
      );
    }
    const loginMech = await UserLoginMech.findOne({
      user: userLogin.uuid,
    });
    // check if password is correct
    const isPasswordCorrect = await comparePassword(
      password,
      loginMech?.password
    );
    if (!isPasswordCorrect)
      throw new createHttpError.BadRequest("Incorrect password");

    const payload = {
      _id: userLogin?._id,
      uuid: userLogin?.uuid,
      firstName: userLogin?.firstName,
      lastName: userLogin?.lastName,
      email: userLogin?.email,
      accountName: userLogin?.accountName,
      isActive: userLogin?.isActive,
      isTrial: userLogin?.isTrial,
      timeZone: userLogin?.timeZone,
    };

    // generate access and refresh tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // save refresh token in db
    await Token.create({
      user: userLogin.uuid,
      token: refreshToken,
    });

    res.status(200).json({
      loggedin: true,
      message: "Login successful",
      data: {
        payload,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = login;
