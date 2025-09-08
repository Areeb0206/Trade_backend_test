const mongoose = require("mongoose");

const polygonOptionChainSchema = mongoose.Schema(
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
    // for the filter and for query
    // date: {
    //   type: String,
    // },
    closePrice: {
      type: Number,
      required: false,
    },
    // symbol name
    name: {
      type: String,
      required: false,
    },
    session: {
      change: {
        type: Number,
        required: false,
      },
      change_percent: {
        type: Number,
        required: false,
      },
      close: {
        type: Number,
        required: false,
      },
      high: {
        type: Number,
        required: false,
      },
      low: {
        type: Number,
        required: false,
      },
      open: {
        type: Number,
        required: false,
      },
      previous_close: {
        type: Number,
        required: false,
      },
    },
    strike: {
      type: Number,
      required: false,
    },
    expiry: {
      type: String,
      required: false,
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
    greeks: {
      call: {
        type: Number,
        required: false,
      },
      put: {
        type: Number,
        required: false,
      },
      actualDelta: {
        type: Number,
        required: false,
      },
    },
    data: [
      {
        // key: {
        //   type: String,
        //   required: false,
        // },
        // expiration_date: {
        //   type: String,
        //   required: false,
        // },
        strike_price: {
          type: Number,
          required: false,
        },
        call: {
          details: {
            contract_type: {
              type: String,
              required: false,
            },
            exercise_style: {
              type: String,
              required: false,
            },
            // expiration_date: {
            //   type: Number,
            //   required: false,
            // },
            shares_per_contract: {
              type: Number,
              required: false,
            },
            strike_price: {
              type: Number,
              required: false,
            },
            ticker: {
              type: String,
              required: false,
            },
          },
          greeks: {
            delta: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
            gamma: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
            theta: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
            vega: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
          },
          implied_volatility: {
            type: Number,
            required: false,
          },
          open_interest: {
            type: Number,
            required: false,
          },
          underlying_asset: {
            last_updated: {
              type: Number,
              required: false,
            },
            value: {
              type: Number,
              required: false,
            },
            ticker: {
              type: String,
              required: false,
            },
            timeframe: {
              type: String,
              required: false,
            },
          },
        },
        put: {
          details: {
            contract_type: {
              type: String,
              required: false,
            },
            exercise_style: {
              type: String,
              required: false,
            },
            // expiration_date: {
            //   type: Number,
            //   required: false,
            // },
            shares_per_contract: {
              type: Number,
              required: false,
            },
            strike_price: {
              type: Number,
              required: false,
            },
            ticker: {
              type: String,
              required: false,
            },
          },
          greeks: {
            delta: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
            gamma: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
            theta: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
            vega: {
              type: mongoose.Schema.Types.Mixed,
              required: false,
            },
          },
          implied_volatility: {
            type: Number,
            required: false,
          },
          open_interest: {
            type: Number,
            required: false,
          },
          underlying_asset: {
            last_updated: {
              type: Number,
              required: false,
            },
            value: {
              type: Number,
              required: false,
            },
            ticker: {
              type: String,
              required: false,
            },
            timeframe: {
              type: String,
              required: false,
            },
          },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
polygonOptionChainSchema.index({ strike: 1, date: 1, expiry: 1 });

const PolygonOptionChain = mongoose.model(
  "PolygonOptionChain",
  polygonOptionChainSchema,
  "polygonOptionChain"
);

module.exports = PolygonOptionChain;
