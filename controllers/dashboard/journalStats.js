const DailyJournal = require("../../models/DailyJournal.model");

const journalStats = async (req, res, next) => {
  try {
    const { uuid: user } = req.user;

    const data = await DailyJournal.aggregate([
      {
        $match: {
          user,
        },
      },
      {
        $group: {
          _id: "$date",
          entries: {
            $push: {
              type: "$type",
              notes: "$notes",
              attachments: "$attachments",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          diary: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$entries",
                  as: "entry",
                  cond: { $eq: ["$$entry.type", "diary"] },
                },
              },
              0,
            ],
          },
          pre_market: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$entries",
                  as: "entry",
                  cond: { $eq: ["$$entry.type", "pre-market"] },
                },
              },
              0,
            ],
          },
          post_market: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$entries",
                  as: "entry",
                  cond: { $eq: ["$$entry.type", "post-market"] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          diary: "$diary.notes",
          pre_market: "$pre_market.notes",
          post_market: "$post_market.notes",
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
    ]);

    // Apply the regex replacement to filter empty notes
    const processedData = data.map((item) => {
      const exp = /<p[^>]*>( |\s+|<br\s*\/?>)*<\/p>/g;

      const diary = item.diary ? item.diary.replace(exp, "") : null;
      const pre_market = item.pre_market
        ? item.pre_market.replace(exp, "")
        : null;
      const post_market = item.post_market
        ? item.post_market.replace(exp, "")
        : null;

      return {
        date: item.date,
        ...(!!diary && { diary }),
        ...(!!pre_market && { pre_market }),
        ...(!!post_market && { post_market }),
        // diary: diary !== null && diary.trim() !== "" ? diary : null,
        // pre_market:
        //   pre_market !== null && pre_market.trim() !== "" ? pre_market : null,
        // post_market:
        //   post_market !== null && post_market.trim() !== ""
        //     ? post_market
        //     : null,
      };
    });

    // Filter out records where all notes are null
    const filteredData = processedData.filter(
      (item) => !!item?.diary || !!item?.pre_market || !!item?.post_market
    );

    res.json({
      data: filteredData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = journalStats;
