const CouponHistory = require("../../models/CouponHistory.model");
const Coupon = require("../../models/Coupon.model");
const stripe = require("../../services/stripe/getStripe");

const customerCouponUsage = async (req, res, next) => {
  try {
    let searchCriteria = {};
    let userSearchCriteria = {};
    const { id } = req.params;
    const { start, limit, keyword, status } = req.query;
    if (keyword) {
      userSearchCriteria["$or"] = [
        { "user.firstName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.lastName": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.userHandle": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        { "user.email": { $regex: `${keyword.trim()}.*`, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$user.firstName", " ", "$user.lastName"] },
              regex: `${keyword.trim()}.*`,
              options: "i",
            },
          },
        },
      ];
    }
    if (status) {
      searchCriteria = {
        ...searchCriteria,
        isUsed: status === "true",
      };
    }
    const coupon = await stripe.coupons.retrieve(id);

    if (!coupon) {
      throw new Error("Coupon not found ");
    }
    const data = await CouponHistory.aggregate([
      {
        $match: {
          couponCode: id,
          ...searchCriteria,
        },
      },
      {
        $lookup: {
          from: "user",
          localField: "user",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
        },
      },
      {
        $match: userSearchCriteria,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [{ $skip: +start || 0 }, { $limit: +limit || 10 }],
          count: [
            {
              $count: "total",
            },
          ],
        },
      },
    ]);

    // const customers = await stripe.customers.list({
    //   coupon: id,
    //   limit: 100,
    //   // expand: ["data.subscriptions"],
    // });

    res.json({
      message: "Fetched successfully",
      coupon,
      data: data?.[0]?.data,
      count: data?.[0]?.count?.[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = customerCouponUsage;

// const CouponHistory = require("../../models/CouponHistory.model");
// const Coupon = require("../../models/Coupon.model");
// const User = require("../../models/User.model");
// const stripe = require("../../services/stripe/getStripe");

// const customerCouponUsage = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { limit, keyword, status, starting_after, ending_before } = req.query; // Add startingAfter for pagination
//     const limitValue = parseInt(limit) || 10; // Default limit to 10 if not provided
//     let searchCriteria = {};

//     if (keyword) {
//       searchCriteria = {
//         $or: [
//           {
//             name: {
//               $regex: keyword,
//               $options: "i",
//             },
//           },
//           {
//             email: {
//               $regex: keyword,
//               $options: "i",
//             },
//           },
//         ],
//       };
//     }
//     if (status) {
//       searchCriteria = {
//         ...searchCriteria,
//         isUsed: status === "true",
//       };
//     }

//     const coupon = await stripe.coupons.retrieve(id);
//     if (!coupon) {
//       throw new Error("Coupon not found in our database");
//     }

//     const customers = await stripe.customers.list({
//       coupon: id,
//       limit: limitValue,
//       ...(starting_after && { starting_after }),
//       ...(ending_before && { ending_before }),
//     });

//     const response = await Promise.all(
//       customers?.data?.map(async (customer) => {
//         const user = await User.findOne({ "stripe.customerId": customer.id });
//         const couponHistory = await CouponHistory.findOne({
//           couponCode: id,
//           user: user?.uuid,
//         })?.sort({ createdAt: -1 });
//         return {
//           ...customer,
//           user,
//           couponHistory,
//         };
//       })
//     );

//     res.json({
//       message: "Fetched successfully",
//       coupon,
//       data: response,
//       count: coupon?.times_redeemed,
//       customers,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = customerCouponUsage;
