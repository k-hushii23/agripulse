// ==========================================
// 1. IMPORT REQUIRED MODULES
// ==========================================
require("dotenv").config();
const fs = require("fs");
const path = require("path");
// ==========================================
// 2. API CONFIGURATION
// ==========================================
const API_URL =
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
const API_KEY = process.env.DATA_GOV_API_KEY;
if (!API_KEY) {
    throw new Error("API key missing. Check your .env file.");
}
// ==========================================
// 3. FILE CONFIGURATION
// ==========================================
const outputPath = path.join(
    __dirname,
    "../../database/raw/mandi_raw.json"
);
// ==========================================
// 4. EXTRACTION SETTINGS
// ==========================================
const LIMIT = 1000;
const MAX_RETRIES = 5;
const REQUEST_DELAY = 3000;
// ==========================================
// 5. HELPER: WAIT
// ==========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ==========================================
// 6. FETCH ONE BATCH
// ==========================================
async function fetchBatch(offset) {
    const url = new URL(API_URL);
    url.searchParams.append("api-key", API_KEY);
    url.searchParams.append("format", "json");
    url.searchParams.append("limit", LIMIT);
    url.searchParams.append("offset", offset);
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Fetching offset ${offset}...`);
            const response = await fetch(url);
            if (response.status === 429 || response.status >= 500) {
                throw new Error(`HTTP ${response.status}`);
            }
            if (!response.ok) {
                throw new Error(
                    `API request failed: HTTP ${response.status}`
                );
            }
            const data = await response.json();
            if (!Array.isArray(data.records)) {
                throw new Error("Invalid API response: records missing.");
            }
            return data;
        } catch (error) {
            console.log(
                `Attempt ${attempt}/${MAX_RETRIES} failed:`,
                error.message
            );
            if (attempt === MAX_RETRIES) {
                throw error;
            }
            const delay = REQUEST_DELAY * Math.pow(2, attempt - 1);
            console.log(`Retrying after ${delay / 1000} seconds...`);
            await sleep(delay);
        }
    }
}
// ==========================================
// 7. FETCH ALL AVAILABLE RECORDS
// ==========================================
async function fetchAllRecords() {
    console.log("\nSTARTING RAW DATA EXTRACTION\n");
    let allRecords = [];
    let offset = 0;
    let totalRecords = null;
    while (true) {
        const data = await fetchBatch(offset);
        if (totalRecords === null) {
            totalRecords = Number(data.total);
            if (!Number.isFinite(totalRecords)) {
                throw new Error("Invalid total record count from API.");
            }
            console.log("TOTAL AVAILABLE:", totalRecords);
        }
        const batch = data.records;
        if (batch.length === 0) {
            break;
        }
        allRecords.push(...batch);
        offset += batch.length;
        console.log(
            `Downloaded ${allRecords.length} / ${totalRecords}`
        );
        if (allRecords.length >= totalRecords) {
            break;
        }
        await sleep(REQUEST_DELAY);
    }
    return {
        totalRecords,
        records: allRecords
    };
}
// ==========================================
// 8. MAIN EXTRACTION PROCESS
// ==========================================
async function main() {
    try {
        const result = await fetchAllRecords();
        console.log("\n========== EXTRACTION SUMMARY ==========");
        console.log("API TOTAL:", result.totalRecords);
        console.log("DOWNLOADED:", result.records.length);
        if (result.records.length !== result.totalRecords) {
            throw new Error(
                "Record count mismatch. Raw file not saved."
            );
        }
        fs.mkdirSync(path.dirname(outputPath), {
            recursive: true
        });
        fs.writeFileSync(
            outputPath,
            JSON.stringify(
                {
                    total: result.totalRecords,
                    count: result.records.length,
                    records: result.records
                },
                null,
                2
            )
        );
        console.log("\nRAW DATA SAVED SUCCESSFULLY!");
        console.log("LOCATION:", outputPath);
        console.log("========================================");
    } catch (error) {
        console.error("\nEXTRACTION FAILED:");
        console.error(error.message);
    }
}
// ==========================================
// 9. EXECUTE
// ==========================================
main();