const express = require("express");
const router = express.Router();
const {
  getAlerts,
  createAlert,
  deleteAlert
} = require("../controllers/alertController");

router.get("/alerts", getAlerts);
router.post("/alerts", createAlert);
router.delete("/alerts/:id", deleteAlert);

module.exports = router;