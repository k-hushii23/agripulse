const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AgriPulse Backend API",
    mode: "mock-data",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`AgriPulse API server running on http://localhost:${PORT}`);
});