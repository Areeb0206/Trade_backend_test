const mongoose = require("mongoose");

const optionChainSchema = mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    symbol: {
      type: String,
      required: false,
    },
    underlyingSymbol: {
      type: String,
      required: true,
    },
    closePrice: {
      type: Number,
      required: false,
    },
    closeTime: {
      type: Date,
      required: false,
    },
    strike: {
      type: Number,
      required: false,
    },
    expiry: {
      type: Date,
      required: false,
    },
    date: {
      type: String,
      required: true,
    },
    //unix timestamp
    expiration: {
      type: Number,
      required: false,
    },
    user: {
      type: String,
      required: true,
    },

    data: [
      {
        strike: {
          type: Number,
          required: false,
        },
        iv: {
          type: Number,
          required: false,
        },
        call: {
          vega: {
            type: Number,
            required: false,
          },
          theta: {
            type: Number,
            required: false,
          },
          gamma: {
            type: Number,
            required: false,
          },
          delta: {
            type: Number,
            required: false,
          },
          price: {
            type: Number,
            required: false,
          },
          ask: {
            type: Number,
            required: false,
          },
          bid: {
            type: Number,
            required: false,
          },
        },
        put: {
          bid: {
            type: Number,
            required: false,
          },
          ask: {
            type: Number,
            required: false,
          },
          price: {
            type: Number,
            required: false,
          },
          delta: {
            type: Number,
            required: false,
          },
          gamma: {
            type: Number,
            required: false,
          },
          theta: {
            type: Number,
            required: false,
          },
          vega: {
            type: Number,
            required: false,
          },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
optionChainSchema.index({ strike: 1 });

const OptionChain = mongoose.model(
  "OptionChain",
  optionChainSchema,
  "optionChain"
);

module.exports = OptionChain;
