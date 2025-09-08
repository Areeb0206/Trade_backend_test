const { Schema, model } = require("mongoose");

const cancelReasonSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    //uuid of the user
    userId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    cancellationDate: {
      type: Number,
      required: true,
    },
    subscriptionStartDate: {
      type: Number,
      required: true,
    },
    subscriptionEndDate: {
      type: Number,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    isSeen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const cancelReason = model("cancelReason", cancelReasonSchema, "cancelReason");

module.exports = cancelReason;
