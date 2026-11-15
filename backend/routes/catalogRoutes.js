const express = require("express");
const router = express.Router();
const { getCrops, getMarkets } = require("../controllers/catalogController");

router.get("/crops", getCrops);
router.get("/markets", getMarkets);

module.exports = router;