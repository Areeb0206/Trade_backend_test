const router = require("express").Router();

// bring in models and controllers
// const getCouponsList = require("../../adminController/coupon/getCouponsList");
const createCoupon = require("../../adminController/coupon/createCoupon");
const getCouponsList = require("../../adminController/coupon/getCouponsList");
const deleteCoupon = require("../../adminController/coupon/deleteCoupon");
const couponListFromStripe = require("../../adminController/coupon/couponListFromStripe");
const customerCouponUsage = require("../../adminController/coupon/customerCouponUsage");

// get coupons list
router.get("/", getCouponsList);
// create coupon
router.post("/", createCoupon);
//coupon list from stripe
router.get("/stripe", couponListFromStripe);
// get customer coupon usage
router.get("/:id", customerCouponUsage);
//delete coupon
router.delete("/:id", deleteCoupon);

module.exports = router;
