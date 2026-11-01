const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

// Path to the sample Agmarknet JSON file
const filePath = path.join(
    __dirname,
    "../../database/samples/mandi_sample.json"
);

// Convert DD/MM/YYYY into YYYY-MM-DD
function convertDate(dateString) {
    const [day, month, year] = dateString.split("/");
    return `${year}-${month}-${day}`;
}

async function importMandiData() {
    const client = await pool.connect();

    try {
        const rawData = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(rawData);

        console.log("Total records:", data.records.length);

        await client.query("BEGIN");

        for (const record of data.records) {

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

            // 3. Convert arrival date
            const priceDate = convertDate(record.arrival_date);

            // 4. Insert spot prices
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
                    priceDate,
                    record.min_price,
                    record.max_price,
                    record.modal_price
                ]
            );

            console.log(
                `Imported: ${record.commodity} - ${record.market}`
            );
        }

        await client.query("COMMIT");

        console.log("\nMandi data imported successfully!");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Import failed:", error.message);

    } finally {
        client.release();
        await pool.end();
    }
}

importMandiData();