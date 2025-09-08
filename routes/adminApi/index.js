const router = require("express").Router();

//Admin APIS
const agendaOptionChain = require("../../controllers/broker/agendaOptionChain");
router.post("/agenda/option-chain", agendaOptionChain);

const jwtValidation = require("../../middlewares/jwt_validation");

router.use("/university", jwtValidation, require("./University.route"));
router.use("/user", jwtValidation, require("./User.route"));
router.use("/transaction", jwtValidation, require("./Transaction.route"));
router.use("/dashboard", jwtValidation, require("./Dashboard.route"));
router.use("/coupon", jwtValidation, require("./Coupon.route"));
router.use("/enquiry", jwtValidation, require("./Enquiry.route"));
router.use("/faq", jwtValidation, require("./Faq.route"));
router.use("/option-chain", jwtValidation, require("./OptionChain.route"));

module.exports = router;
