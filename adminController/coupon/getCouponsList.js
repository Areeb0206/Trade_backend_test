const CouponModel = require("../../models/Coupon.model");
const stripe = require("../../services/stripe/getStripe");

const getCouponsList = async (req, res, next) => {
  try {
    // const response = await CouponModel.find().sort({ createdAt: -1 });
    const couponsFromStripe = await stripe.coupons.list({ limit: 100 }); // Stripe's default is 10, use a higher limit for more coupons
    let coupons = couponsFromStripe.data;

    // Handle Pagination - Important if you have more than 100 coupons
    let hasMore = couponsFromStripe.has_more;
    let startingAfter =
      couponsFromStripe.data.length > 0
        ? couponsFromStripe.data[couponsFromStripe.data.length - 1].id
        : null; // start from the last coupon in the first batch

    while (hasMore) {
      const nextCouponsFromStripe = await stripe.coupons.list({
        limit: 100,
        starting_after: startingAfter,
      });
      coupons = coupons.concat(nextCouponsFromStripe.data);
      hasMore = nextCouponsFromStripe.has_more;
      startingAfter =
        nextCouponsFromStripe.data.length > 0
          ? nextCouponsFromStripe.data[nextCouponsFromStripe.data.length - 1].id
          : null;
    }

    res.json({
      message: "Coupons fetched successfully",
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getCouponsList;
