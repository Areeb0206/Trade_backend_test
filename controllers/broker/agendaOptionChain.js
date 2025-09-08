const {
  polygonOptionChain,
} = require("../../services/optionChain/polygonOptionChain");
const { emitSocketEvent } = require("../../services/util/callApi.utils");
const agendaOptionChain = async (req, res, next) => {
  const { userId, symbol, expiry } = req.body;

  try {
    // emit socket
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "option-chain",
        // this id helps us to update the context state for a specific broker

        // status is the status of the event
        status: "progress",
        // error is the error message
        error: null,
      },
    });

    res.json({
      message: "Fetching option chain",
    });
    await polygonOptionChain({ userId, symbol, expiry });

    // emit socket
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "option-chain",
        // this id helps us to update the context state for a specific broker

        // status is the status of the event
        status: "success",
        // error is the error message
        error: null,
      },
    });
    console.log("Fetching option chain ... Agenda");
  } catch (error) {
    await emitSocketEvent({
      body: {
        //room Id
        room: userId,
        // key is the event name
        key: "option-chain",
        // this id helps us to update the context state for a specific broker

        // status is the status of the event
        status: "error",
        // error is the error message
        error: {
          message: error?.message,
        },
      },
    });
    // next(error);
  }
};

module.exports = agendaOptionChain;
