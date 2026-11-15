const express = require("express");
const router = express.Router();
const {
  getLatestPrice,
  getPriceHistory,
  getNearbyMandis
} = require("../controllers/priceController");

router.get("/prices", getLatestPrice);
router.get("/prices/history", getPriceHistory);
router.get("/markets/nearby", getNearbyMandis);

module.exports = router;