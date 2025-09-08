// const axios = require("axios");
// const { getMonthlyDateRanges } = require("../../../util/dayjsHelperFunctions");

// const fetchQuesTradeData = async ({
//   accessToken,
//   apiServer,
//   quesTradeAccount,
//   startTime,
//   endTime,
//   tokenType,
// }) => {
//   const monthRanges = getMonthlyDateRanges(startTime, endTime);

//   // Build all requests first
//   const requests = monthRanges?.map(({ start, end }) => {
//     const url = `${apiServer}v1/accounts/${quesTradeAccount}/activities?startTime=${start}&endTime=${end}`;

//     return axios
//       .get(url, {
//         headers: {
//           Authorization: `${tokenType} ${accessToken}`,
//         },
//       })
//       .then((res) => {
//         const trades = res?.data?.activities?.filter(
//           (activity) => activity.type === "Trades"
//         );
//         return trades;
//       })
//       .catch((err) => {
//         const errMsg = err?.response?.data?.message || err.message;
//         throw new Error(`Error fetching trades from Questrade: ${errMsg}`);
//       });
//   });

//   // Execute all in parallel
//   const results = await Promise.all(requests);

//   // Flatten and return
//   const sort = results
//     .flat()
//     ?.map((i) => {
//       return {
//         ...i,
//         symbol:
//           i?.symbol?.trim()?.toUpperCase() ||
//           i?.description?.split(" ")[0]?.toUpperCase(),
//         orderId:
//           `${i?.tradeDate}-${i?.action}-${i?.symbolId}-${i?.description}-${i?.quantity}-${i?.price}-${i?.grossAmount}-${i?.commission}-${i?.netAmount}`?.replaceAll(
//             /\s+/g,
//             "-"
//           ),
//       };
//     })
//     .sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
//   return sort;
// };

// module.exports = fetchQuesTradeData;

const axios = require("axios");
const { getMonthlyDateRanges } = require("../../../util/dayjsHelperFunctions");

const fetchQuesTradeData = async ({
  accessToken,
  apiServer,
  quesTradeAccount,
  startTime,
  endTime,
  tokenType,
}) => {
  const monthRanges = getMonthlyDateRanges(startTime, endTime);
  const allTrades = [];

  for (const range of monthRanges) {
    const { start, end } = range;
    const url = `${apiServer}v1/accounts/${quesTradeAccount}/activities?startTime=${start}&endTime=${end}`;

    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `${tokenType} ${accessToken}`,
        },
      });

      const trades = res?.data?.activities?.filter(
        (activity) => activity.type === "Trades"
      );

      if (trades) {
        allTrades.push(...trades);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message;
      throw new Error(`Error fetching trades from Questrade: ${errMsg}`);
    }
  }

  // Process and sort the combined results
  const sortedAndMappedTrades = allTrades
    .map((i) => {
      return {
        ...i,
        symbol:
          i?.symbol?.trim()?.toUpperCase() ||
          i?.description?.split(" ")[0]?.toUpperCase(),
        orderId:
          `${i?.tradeDate}-${i?.action}-${i?.symbolId}-${i?.description}-${i?.quantity}-${i?.price}-${i?.grossAmount}-${i?.commission}-${i?.netAmount}`?.replaceAll(
            /\s+/g,
            "-"
          ),
      };
    })
    .sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));

  return sortedAndMappedTrades;
};

module.exports = fetchQuesTradeData;
