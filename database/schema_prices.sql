-- 1. COMMODITIES TABLE
-- Stores crop names, varieties, grades and units.

CREATE TABLE IF NOT EXISTS commodities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    variety VARCHAR(255),
    grade VARCHAR(100),
    unit VARCHAR(50),

    UNIQUE (name, variety, grade)
);

-- 2. MARKETS TABLE
-- Stores agricultural market information.

CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(255),
    state VARCHAR(255),

    UNIQUE (name, district, state)
);


-- 3. SPOT PRICES TABLE
-- Stores daily mandi prices from Agmarknet.

CREATE TABLE IF NOT EXISTS spot_prices (
    id SERIAL PRIMARY KEY,

    commodity_id INTEGER NOT NULL,
    market_id INTEGER NOT NULL,

    price_date DATE NOT NULL,

    min_price NUMERIC(12, 2),
    max_price NUMERIC(12, 2),
    modal_price NUMERIC(12, 2),

    arrival_qty NUMERIC(12, 2),

    FOREIGN KEY (commodity_id)
        REFERENCES commodities(id),

    FOREIGN KEY (market_id)
        REFERENCES markets(id),

    UNIQUE (commodity_id, market_id, price_date)
);

-- 4. SPOT PRICE INDEX
-- Helps retrieve historical prices efficiently.

CREATE INDEX IF NOT EXISTS idx_spot_prices_lookup
ON spot_prices (commodity_id, market_id, price_date);

-- 5. FUTURES PRICES TABLE
-- Stores NCDEX futures market data.

CREATE TABLE IF NOT EXISTS futures_prices (
    id SERIAL PRIMARY KEY,

    commodity_id INTEGER NOT NULL,

    contract_month DATE,
    expiry_date DATE,
    price_date DATE NOT NULL,

    settlement_price NUMERIC(12, 2),

    FOREIGN KEY (commodity_id)
        REFERENCES commodities(id),

    UNIQUE (commodity_id, contract_month, price_date)
);