const fs = require("fs");
const path = require("path");

// 1.FILE PATHS

const inputPath = path.join(
    __dirname,
    "../../database/raw/mandi_raw.json"
);

const outputPath = path.join(
    __dirname,
    "../../database/clean/ncr_mandi.json"
);

// 2. READ RAW DATA

const rawData = JSON.parse(
    fs.readFileSync(inputPath, "utf8")
);

const records = Array.isArray(rawData)
    ? rawData
    : rawData.records;

if (!Array.isArray(records)) {
    throw new Error("Invalid dataset: records array not found");
}

// 3. DELHI-CENTRIC NCR DISTRICTS

const ncrDistricts = [
    "Delhi",
    "Faridabad",
    "Gurugram",
    "Ghaziabad"
];

// 4. NORMALIZE DISTRICT NAMES

function normalizeDistrict(district) {
    const value = String(district || "").trim().toLowerCase();

    const aliases = {
        "gurgaon": "gurugram"
    };

    return aliases[value] || value;
}

// 5. FILTER NCR RECORDS

const ncrDistrictSet = new Set(
    ncrDistricts.map(district => district.toLowerCase())
);

const ncrRecords = records.filter(record => {
    const district = normalizeDistrict(record.district);
    return ncrDistrictSet.has(district);
});

// 6. STANDARDIZE DISTRICT NAMES

const cleanedRecords = ncrRecords.map(record => {
    const normalizedDistrict = normalizeDistrict(record.district);

    return {
        ...record,
        district: normalizedDistrict === "gurugram"
            ? "Gurugram"
            : normalizedDistrict === "delhi"
                ? "Delhi"
                : normalizedDistrict === "faridabad"
                    ? "Faridabad"
                    : "Ghaziabad"
    };
});

// 7.CREATE OUTPUT DIRECTORY

fs.mkdirSync(
    path.dirname(outputPath),
    { recursive: true }
);

// 8.SAVE CLEAN DATASET

const outputData = {
    source: "data.gov.in",
    region: "Delhi-centric NCR",
    total_original_records: records.length,
    total_ncr_records: cleanedRecords.length,
    records: cleanedRecords
};

fs.writeFileSync(
    outputPath,
    JSON.stringify(outputData, null, 4),
    "utf8"
);

// 9. DISTRICT BREAKDOWN

const districtCounts = {};

cleanedRecords.forEach(record => {
    const district = record.district;

    districtCounts[district] =
        (districtCounts[district] || 0) + 1;
});

// 10. FINAL REPORT

console.log("\n==================================");
console.log("     AGRIPULSE NCR EXTRACTION");
console.log("==================================");

console.log("\nTOTAL ORIGINAL RECORDS:", records.length);
console.log("TOTAL NCR RECORDS:", cleanedRecords.length);

console.log("\nDISTRICT BREAKDOWN:");
console.table(districtCounts);

console.log(
    "\nUNIQUE DISTRICTS:",
    Object.keys(districtCounts).length
);

console.log(
    "\nUNIQUE ARRIVAL DATES:",
    [...new Set(cleanedRecords.map(r => r.arrival_date))]
);

console.log("\nSAVED TO:", outputPath);

console.log("\n==================================");
console.log("       EXTRACTION COMPLETE");
console.log("==================================\n");