const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env")
});

const pool = new Pool({
  user: process.env.USER,
  host: "/tmp",
  database: "agripulse",
  port: 5432,
});

module.exports = pool;  