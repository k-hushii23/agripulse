require("dotenv").config();

const fs = require("fs");
const path = require("path");

// ==========================================
// GOVERNMENT API CONFIGURATION
// ==========================================

const API_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

// ==========================================
// FETCH MANDI DATA
// ==========================================

async function fetchMandiData() {
  try {
    console.log("Connecting to data.gov.in...");

    if (!process.env.DATA_GOV_API_KEY) {
      throw new Error("API key missing. Check your .env file.");
    }

    // Build API URL
    const url = new URL(API_URL);

    url.searchParams.append("api-key", process.env.DATA_GOV_API_KEY);
    url.searchParams.append("format", "json");
    url.searchParams.append("limit", "10");
    url.searchParams.append("offset", "0");

    // Fetch API data using native Fetch
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    // Convert response to JSON
    const data = await response.json();

    console.log("API connected successfully!");

    // Save API response
    const outputPath = path.join(
      __dirname,
      "../../database/samples/mandi_sample.json"
    );

    // Create directory if it doesn't exist
    fs.mkdirSync(path.dirname(outputPath), {
      recursive: true,
    });

    // Write JSON file
    fs.writeFileSync(
      outputPath,
      JSON.stringify(data, null, 2)
    );

    // Display results
    console.log("Sample data saved successfully!");
    console.log("Total records:", data.records?.length || 0);
    console.log("Total available records:", data.total || "Not provided");
    console.log("First record:", data.records?.[0] || "No records found");

  } catch (error) {
    console.error("Something went wrong:");
    console.error(error.message);
  }
}

// ==========================================
// EXECUTE
// ==========================================

fetchMandiData();