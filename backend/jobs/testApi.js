require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Government API endpoint
const API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

async function fetchMandiData() {
  try {
    console.log("Connecting to data.gov.in...");

    const response = await axios.get(API_URL, {
      params: {
        "api-key": process.env.DATA_GOV_API_KEY,
        format: "json",
        limit: 10,
        offset: 0,
      },
    });

    console.log("API connected successfully!");

    // Save the API response
    const outputPath = path.join(
      __dirname,
      "../../database/samples/mandi_sample.json"
    );

    fs.writeFileSync(
      outputPath,
      JSON.stringify(response.data, null, 2)
    );

    console.log("Sample data saved successfully!");
    console.log("Total records:", response.data.records?.length);
    console.log("First record:", response.data.records?.[0]);

  } catch (error) {
    console.log("Something went wrong:");

    console.log(
      error.response?.data || error.message
    );
  }
}

fetchMandiData();