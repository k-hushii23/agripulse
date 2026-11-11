require("dotenv").config();

const pool = require("../config/db");

// ==========================================

// API CONFIGURATION

// ==========================================

const API_URL =

    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

const LIMIT = 1000;

const MAX_RETRIES = 4;

const REQUEST_TIMEOUT = 60000;

// ==========================================

// 1. FETCH ALL MANDI DATA USING PAGINATION

// WITH AUTOMATIC RETRIES

// ==========================================

async function fetchAllMandiData() {

    let allRecords = [];

    let offset = 0;

    let totalRecords = 0;

    // Check API key

    if (!process.env.DATA_GOV_API_KEY) {

        throw new Error("DATA_GOV_API_KEY is missing in .env file");

    }

    try {

        while (true) {

            console.log(`Fetching records from offset ${offset}...`);

            let data;

            // Retry mechanism

            for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {

                try {

                    // Construct API URL with query parameters

                    const url = new URL(API_URL);

                    url.searchParams.append(

                        "api-key",

                        process.env.DATA_GOV_API_KEY

                    );

                    url.searchParams.append("format", "json");

                    url.searchParams.append("limit", LIMIT);

                    url.searchParams.append("offset", offset);

                    // Make HTTP request using native Fetch

                    const response = await fetch(url, {

                        method: "GET",

                        signal: AbortSignal.timeout(REQUEST_TIMEOUT)

                    });

                    // Handle HTTP errors

                    if (!response.ok) {

                        const error = new Error(

                            `HTTP Error: ${response.status}`

                        );

                        error.status = response.status;

                        throw error;

                    }

                    // Convert JSON response into JavaScript object

                    data = await response.json();

                    // Request successful

                    break;

                } catch (error) {

                    const status = error.status;

                    const shouldRetry =

                        !status ||

                        status === 429 ||

                        status >= 500;

                    if (!shouldRetry || attempt > MAX_RETRIES) {

                        throw error;

                    }

                    // Exponential backoff

                    const delay = Math.pow(2, attempt) * 1000;

                    console.log(

                        `Request failed at offset ${offset}.`

                    );

                    console.log(

                        `Retry attempt ${attempt}/${MAX_RETRIES}`

                    );

                    console.log(

                        `Waiting ${delay / 1000} seconds before retrying...`

                    );

                    await new Promise(resolve =>

                        setTimeout(resolve, delay)

                    );

                }

            }

            // Validate API response

            if (!Array.isArray(data.records)) {

                throw new Error(

                    "Invalid API response: records must be an array"

                );

            }

            const records = data.records;

            // Validate total records

            const apiTotal = Number(data.total);

            if (!Number.isFinite(apiTotal) || apiTotal < 0) {

                throw new Error(

                    "Invalid API response: total records unavailable"

                );

            }

            totalRecords = apiTotal;

            // Store fetched records

            allRecords.push(...records);

            console.log(`Fetched ${records.length} records.`);

            // Stop if no records are returned

            if (records.length === 0) {

                break;

            }

            // Update offset

            offset += records.length;

            // Stop when all records are fetched

            if (offset >= totalRecords) {

                break;

            }

            // Delay between requests

            await new Promise(resolve =>

                setTimeout(resolve, 500)

            );

        }

        console.log("\nFetching completed!");

        console.log("Total available:", totalRecords);

        console.log("Total fetched:", allRecords.length);

        if (allRecords.length < totalRecords) {

            console.log(

                "WARNING: Some API records could not be fetched."

            );

        }

        return allRecords;

    } catch (error) {

        console.error(

            "API fetching failed:",

            error.message

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

        if (

            value === null ||

            value === undefined ||

            value === ""

        ) {

            return null;

        }

        const number = Number(value);

        return Number.isFinite(number) && number >= 0

            ? number

            : null;

    }

    // Return standardized record

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

        record.modal_price === null ||

        record.min_price > record.max_price

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

        console.log(

            "Starting Agmarknet data ingestion...\n"

        );

        // Fetch all records from API

        const records = await fetchAllMandiData();

        fetched = records.length;

        // Connect to PostgreSQL

        client = await pool.connect();

        // Begin database transaction

        await client.query("BEGIN");

        // Process every API record

        for (const rawRecord of records) {

            // Create checkpoint before processing

            await client.query(

                "SAVEPOINT record_savepoint"

            );

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

                // Release checkpoint after success

                await client.query(

                    "RELEASE SAVEPOINT record_savepoint"

                );

            } catch (error) {

                // Count failed records

                failed++;

                console.error(

                    "Record failed:",

                    error.message

                );

                // Roll back only current record

                await client.query(

                    "ROLLBACK TO SAVEPOINT record_savepoint"

                );

                await client.query(

                    "RELEASE SAVEPOINT record_savepoint"

                );

            }

        }

        // Save all successful database changes

        await client.query("COMMIT");

        // ==========================================

        // INGESTION SUMMARY

        // ==========================================

        console.log("\n========== INGESTION SUMMARY ==========");

        console.log("Rows fetched:", fetched);

        console.log("Rows processed:", processed);

        console.log("Rows skipped:", skipped);

        console.log("Rows failed:", failed);

        console.log("=======================================");

        console.log(

            "\nAgmarknet ingestion completed successfully!"

        );

    } catch (error) {

        // Roll back entire transaction if main process fails

        if (client) {

            try {

                await client.query("ROLLBACK");

                console.log(

                    "Database transaction rolled back."

                );

            } catch (rollbackError) {

                console.error(

                    "Rollback failed:",

                    rollbackError.message

                );

            }

        }

        console.error(

            "\nIngestion failed:",

            error.message

        );

    } finally {

        // Release database connection

        if (client) {

            client.release();

        }

        // Close connection pool for standalone execution

        await pool.end();

    }

}

// ==========================================

// 5. RUN THE INGESTION

// ==========================================

ingestSpotData();