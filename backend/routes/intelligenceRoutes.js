const express = require("express");
const router = express.Router();
const {
  getEstimatedRange,
  getPredictions,
  getRecommendation
} = require("../controllers/intelligenceController");

router.get("/prices/range", getEstimatedRange);
router.get("/predictions", getPredictions);
router.get("/recommendations", getRecommendation);

module.exports = router;