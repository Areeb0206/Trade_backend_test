function printOrders(inData) {
  const allOrderIds = [];

  try {
    if (!!inData?.OrdersResponse?.Order?.length === false) {
      return []; // Or throw an error, depending on desired behavior
    }

    const orders = inData?.OrdersResponse?.Order;

    const res = orders
      ?.map((i) => {
        if (!i) {
          console.warn("Skipping null/undefined order item.");
          return null; // Skip this order
        }

        let orderDetail, instrument;

        if (i.OrderDetail) {
          orderDetail = i.OrderDetail[0];
          instrument = orderDetail?.Instrument
            ? Array.isArray(orderDetail.Instrument)
              ? orderDetail.Instrument[0]
              : orderDetail.Instrument
            : null; // Handle single or array
        } else if (i.Order) {
          orderDetail = i.Order;
          instrument = orderDetail?.Instrument;
        } else {
          orderDetail = null;
          instrument = null;
        }

        const placedTime = orderDetail?.placedTime || i?.placedTime;

        let orderAction = null;
        let symbol = null;

        if (instrument) {
          orderAction = instrument?.orderAction;
          symbol = instrument?.Product?.symbol;
        }

        const orderedQuantity =
          instrument?.orderedQuantity || instrument?.quantity || 0;
        const averageExecutionPrice = instrument?.averageExecutionPrice || null;
        const commission = instrument?.estimatedCommission || null;
        allOrderIds.push(i?.orderId);
        return {
          date: placedTime,
          orderId: i?.orderId,
          orderType: i?.orderType,
          commission,
          orderAction: orderAction,
          orderedQuantity: orderedQuantity,
          symbol: symbol,
          priceType: orderDetail?.priceType || orderDetail?.priceType,
          status: orderDetail?.status || null,
          priceExecuted: averageExecutionPrice,
          securityType: instrument?.Product?.securityType || null,
          callPut: instrument?.Product?.callPut || null,
          expiryYear: instrument?.Product?.expiryYear || null,
          expiryMonth: instrument?.Product?.expiryMonth || null,
          expiryDay: instrument?.Product?.expiryDay || null,
          strikePrice: instrument?.Product?.strikePrice || null,
        };
      })
      .filter((item) => item !== null); // Remove any skipped orders

    return [res, allOrderIds];
  } catch (err) {
    console.error("Error processing orders:", err); // Log the error for debugging
    throw Error(err); // Re-throw the error for the calling function to handle
  }
}

module.exports = printOrders;
