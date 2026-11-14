const fs = require("fs");
const path = require("path");

// 1. INPUT FILE

const inputPath = path.join(
    __dirname,
    "../../database/clean/ncr_mandi.json"
);

// 2. READ DATA

const data = JSON.parse(
    fs.readFileSync(inputPath, "utf8")
);

const records = data.records;

// 3. BASIC INFORMATION

console.log("\nTOTAL RECORDS:", records.length);

// 4. FIRST RECORD

console.log("\nFIRST RECORD:");
console.log(records[0]);

// 5. AVAILABLE FIELDS

console.log("\nAVAILABLE FIELDS:");
console.log(Object.keys(records[0]));

// 6. SAMPLE RECORDS

console.log("\nSAMPLE OF FIVE RECORDS:");
console.table(records.slice(0, 5));

// 7. MISSING VALUE ANALYSIS

console.log("\nMISSING VALUE ANALYSIS:");

const fields = Object.keys(records[0]);

fields.forEach(field => {

    const missing = records.filter(record =>
        record[field] === null ||
        record[field] === undefined ||
        String(record[field]).trim() === ""
    ).length;

    console.log(`${field}: ${missing} missing values`);

});