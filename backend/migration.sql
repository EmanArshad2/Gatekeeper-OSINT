-- Phase 5 migration — Investigation Case tables.
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'ACTIVE',
    analyst VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS case_wallets (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    wallet_id INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT NOW()
);