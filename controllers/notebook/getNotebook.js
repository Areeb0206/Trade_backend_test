const Trade = require("../../models/Trade.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { searchBy } = require("../../utils/socket/searchBy");
const DailyJournal = require("../../models/DailyJournal.model");
dayjs.extend(utc);

const getNotebook = async (req, res, next) => {
  const { startDate, endDate, type } = req.query;
  const { uuid: userId } = req.user;

  let searchCriteria = {};
  if (startDate || endDate) {
    searchCriteria = {
      date: {},
    };

    if (startDate) {
      searchCriteria.date.$gte = dayjs(startDate)
        .startOf("day")
        .format("YYYY-MM-DD");
    }
    if (endDate) {
      searchCriteria.date.$lte = dayjs(endDate)
        .endOf("day")
        .format("YYYY-MM-DD");
    }
  }

  const matchQuery = {
    type: type,
    user: userId,
    ...(Object.keys(searchCriteria.date).length
      ? { date: searchCriteria.date }
      : {}),
  };
  try {
    const trades = await DailyJournal.aggregate([
      {
        $facet: {
          data: [
            {
              $match: matchQuery,
            },
          ],
          icons: [
            {
              $match: {
                type,
                user: userId,
              },
            },
          ],
        },
      },
    ]);

    // Apply regex replacement to 'icons'
    const processedIcons =
      trades?.[0]?.icons
        ?.map((item) => {
          const exp = /<p[^>]*>( |\s+|<br\s*\/?>)*<\/p>/g; // Updated regex
          // Assuming 'notes' or similar field exists within your 'icons' entries
          if (item.notes) {
            // Check if 'notes' field exists
            item.notes = item.notes.replace(exp, "").trim(); // Clean up and remove extra spaces
          }
          return item;
        })
        ?.filter((item) => item?.notes) || []; // Provide a default empty array if trades[0] is null or undefined

    res.status(200).json({
      success: true,
      data: trades?.[0]?.data,
      icons: processedIcons,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getNotebook;
