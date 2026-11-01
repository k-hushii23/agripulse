require("dotenv").config();

const axios = require("axios");

const pool = require("../config/db");

// Agmarknet API endpoint

const API_URL =

    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

// Number of records fetched per request

const LIMIT = 1000;

// ==========================================

// 1. FETCH ALL MANDI DATA USING PAGINATION

// ==========================================

async function fetchAllMandiData() {

    let allRecords = [];

    let offset = 0;

    let totalRecords = 0;

    try {

        while (true) {

            console.log(`Fetching records from offset ${offset}...`);

            const response = await axios.get(API_URL, {

                params: {

                    "api-key": process.env.DATA_GOV_API_KEY,

                    format: "json",

                    limit: LIMIT,

                    offset: offset

                },

                timeout: 30000

            });

            const records = response.data.records || [];

            totalRecords = Number(response.data.total);

            allRecords.push(...records);

            console.log(`Fetched ${records.length} records.`);

            if (records.length === 0) {

                break;

            }

            offset += records.length;

            if (offset >= totalRecords) {

                break;

            }

            // Small delay between API requests

            await new Promise(resolve => setTimeout(resolve, 300));

        }

        console.log("\nFetching completed!");

        console.log("Total available:", totalRecords);

        console.log("Total fetched:", allRecords.length);

        return allRecords;

    } catch (error) {

        console.error(

            "API fetching failed:",

            error.response?.data || error.message

        );

        throw error;

    }

}

// ==========================================

// 2. CLEAN AND STANDARDIZE API RECORDS

// ==========================================

function cleanRecord(record) {

    // Convert DD/MM/YYYY into YYYY-MM-DD

    function convertDate(dateString) {

        if (!dateString) return null;

        const parts = dateString.split("/");

        if (parts.length !== 3) return null;

        const [day, month, year] = parts;

        const date = new Date(

            Number(year),

            Number(month) - 1,

            Number(day)

        );

        // Reject invalid calendar dates

        if (

            date.getFullYear() !== Number(year) ||

            date.getMonth() !== Number(month) - 1 ||

            date.getDate() !== Number(day)

        ) {

            return null;

        }

        return `${year}-${month}-${day}`;

    }

    // Convert price into a valid number

    function cleanPrice(value) {

        if (value === null || value === undefined || value === "") {

            return null;

        }

        const number = Number(value);

        return Number.isFinite(number) && number >= 0

            ? number

            : null;

    }

    return {

        state: record.state?.trim() || null,

        district: record.district?.trim() || null,

        market: record.market?.trim() || null,

        commodity: record.commodity?.trim() || null,

        variety: record.variety?.trim() || null,

        grade: record.grade?.trim() || null,

        price_date: convertDate(record.arrival_date),

        min_price: cleanPrice(record.min_price),

        max_price: cleanPrice(record.max_price),

        modal_price: cleanPrice(record.modal_price)

    };

}

// ==========================================

// 3. INSERT OR UPDATE COMMODITY, MARKET,

//    AND SPOT PRICE RECORDS

// ==========================================

async function insertMandiRecord(client, record) {

    // Skip records missing essential information

    if (

        !record.commodity ||

        !record.market ||

        !record.state ||

        !record.price_date ||

        record.min_price === null ||

        record.max_price === null ||

        record.modal_price === null

    ) {

        return false;

    }

    // 1. Insert or find commodity

    const commodityResult = await client.query(

        `INSERT INTO commodities (name, variety, grade)

         VALUES ($1, $2, $3)

         ON CONFLICT (name, variety, grade)

         DO UPDATE SET name = EXCLUDED.name

         RETURNING id`,

        [

            record.commodity,

            record.variety,

            record.grade

        ]

    );

    const commodityId = commodityResult.rows[0].id;

    // 2. Insert or find market

    const marketResult = await client.query(

        `INSERT INTO markets (name, district, state)

         VALUES ($1, $2, $3)

         ON CONFLICT (name, district, state)

         DO UPDATE SET name = EXCLUDED.name

         RETURNING id`,

        [

            record.market,

            record.district,

            record.state

        ]

    );

    const marketId = marketResult.rows[0].id;

    // 3. Insert or update spot price

    await client.query(

        `INSERT INTO spot_prices

         (commodity_id, market_id, price_date,

          min_price, max_price, modal_price)

         VALUES ($1, $2, $3, $4, $5, $6)

         ON CONFLICT (commodity_id, market_id, price_date)

         DO UPDATE SET

            min_price = EXCLUDED.min_price,

            max_price = EXCLUDED.max_price,

            modal_price = EXCLUDED.modal_price`,

        [

            commodityId,

            marketId,

            record.price_date,

            record.min_price,

            record.max_price,

            record.modal_price

        ]

    );

    return true;

}

// ==========================================

// 4. MAIN INGESTION FUNCTION

// ==========================================

async function ingestSpotData() {

    let client;

    let fetched = 0;

    let processed = 0;

    let skipped = 0;

    let failed = 0;

    try {

        console.log("Starting Agmarknet data ingestion...\n");

        // Fetch all records from API

        const records = await fetchAllMandiData();

        fetched = records.length;

        // Connect to PostgreSQL

        client = await pool.connect();

        // Begin database transaction

        await client.query("BEGIN");

        for (const rawRecord of records) {

            try {

                // Clean API record

                const cleanedRecord = cleanRecord(rawRecord);

                // Insert into database

                const success = await insertMandiRecord(

                    client,

                    cleanedRecord

                );

                if (success) {

                    processed++;

                } else {

                    skipped++;

                }

            } catch (error) {

                // Stop the entire transaction on database errors

                throw error;

            }

        }

        // Save all database changes

        await client.query("COMMIT");

        console.log("\n========== INGESTION SUMMARY ==========");

        console.log("Rows fetched:", fetched);

        console.log("Rows processed:", processed);

        console.log("Rows skipped:", skipped);

        console.log("Rows failed:", failed);

        console.log("=======================================");

        console.log("\nAgmarknet ingestion completed successfully!");

    } catch (error) {

        if (client) {

            await client.query("ROLLBACK");

        }

        console.error("\nIngestion failed:", error.message);

        console.log("Database transaction rolled back.");

    } finally {

        if (client) {

            client.release();

        }

        await pool.end();

    }

}


// 5. RUN THE INGESTION


ingestSpotData();