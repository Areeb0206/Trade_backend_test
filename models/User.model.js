const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    timeZone: {
      type: String,
    },
    lastName: {
      type: String,
      required: true,
    },
    // uuid of accounts
    accounts: [
      {
        type: String,
      },
    ],
    email: {
      type: String,
      required: true,
      unique: true,
    },
    userHandle: {
      type: String,
      unique: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["customer"],
      default: "customer",
    },
    limits: {
      accounts: {
        type: Number,
        default: 1,
      },
      backtesting: {
        type: Boolean,
        default: false,
      },
      storage: {
        type: Number,
        default: 1,
      },
      plan: {
        type: String,
        default: "free",
        enum: [
          "free",
          "basic_monthly",
          "basic_yearly",
          "premium_monthly",
          "premium_yearly",
        ],
      },
    },

    stripe: {
      customerId: {
        type: String,
        required: false,
      },
      cancel_reason: {
        type: String,
        required: false,
      },
      renew_count: {
        type: Number,
        default: 0,
        required: false,
      },
      subscriptionId: {
        type: String,
        required: false,
      },
      subscriptionStatus: {
        type: String,
        default: "inactive",
        enum: ["inactive", "active"],
      },
      cancelReason: {
        type: String,
        required: false,
      },
      subscriptionValidUntil: {
        type: Date,
        required: false,
      },
      // this is the last fingerprint used to make a payment
      fingerPrint: {
        type: String,
        required: false,
      },
      // here's a list of all the fingerprints used to make a payment
      usedFingerPrints: [
        {
          type: String,
        },
      ],
      defaultPaymentMethod: {
        type: String,
        required: false,
      },

      cancel_at: {
        type: Number,
        required: false,
      },
      canceled_at: {
        type: Number,
        required: false,
      },
      isTrial: {
        type: Boolean,
      },
      trialEndsAt: {
        type: Date,
      },
    },
    // snapTrade
    snapTrade: {
      userSecret: {
        type: String,
      },
    },
    // trial period
    isTrial: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema, "user");

module.exports = User;
