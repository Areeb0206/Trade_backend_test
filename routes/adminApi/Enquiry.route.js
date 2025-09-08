const router = require("express").Router();

// bring in models and controllers
const enquiryList = require("../../adminController/enquiry/enquiryList");
const unseenCount = require("../../adminController/enquiry/unseenCount");
const updateSeenCount = require("../../adminController/enquiry/updateSeenCount");
const replyToEnquiry = require("../../adminController/enquiry/replyToEnquiry");

router.get("/", enquiryList);
router.post("/reply/:id", replyToEnquiry);
router.get("/unseen-count", unseenCount);
router.put("/update-seen-count", updateSeenCount);

module.exports = router;
