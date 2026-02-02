-- Minimal schema for MVP (expand as needed).
-- Safe to run multiple times (IF NOT EXISTS used).

CREATE TABLE IF NOT EXISTS option_instruments (
  option_symbol TEXT PRIMARY KEY,
  root TEXT NOT NULL,
  expiration DATE NOT NULL,
  strike DOUBLE PRECISION NOT NULL,
  right TEXT NOT NULL, -- 'C' or 'P'
  style TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chain_snapshots (
  snapshot_id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  underlying TEXT NOT NULL,
  target_dte INTEGER NOT NULL,
  expiration DATE NOT NULL,
  payload_json JSONB NOT NULL,
  checksum TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_snapshots_ts ON chain_snapshots (ts DESC);
CREATE INDEX IF NOT EXISTS idx_chain_snapshots_exp ON chain_snapshots (expiration, ts DESC);

CREATE TABLE IF NOT EXISTS context_snapshots (
  ts TIMESTAMPTZ PRIMARY KEY,
  vix DOUBLE PRECISION NULL,
  vix9d DOUBLE PRECISION NULL,
  term_structure DOUBLE PRECISION NULL,
  gex_net DOUBLE PRECISION NULL,
  zero_gamma_level DOUBLE PRECISION NULL,
  notes_json JSONB NULL
);

CREATE TABLE IF NOT EXISTS trade_decisions (
  decision_id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  target_dte INTEGER NOT NULL,
  entry_slot INTEGER NOT NULL, -- 10/11/12
  delta_target DOUBLE PRECISION NOT NULL,
  chosen_legs_json JSONB NULL,
  ruleset_version TEXT NOT NULL,
  score DOUBLE PRECISION NULL,
  decision TEXT NOT NULL, -- 'TRADE'/'SKIP'
  reason TEXT NULL,
  chain_snapshot_id BIGINT NULL REFERENCES chain_snapshots(snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_decisions_ts ON trade_decisions (ts DESC);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  decision_id BIGINT NULL REFERENCES trade_decisions(decision_id),
  status TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NULL,
  request_json JSONB NOT NULL,
  response_json JSONB NULL
);

CREATE TABLE IF NOT EXISTS fills (
  fill_id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  ts TIMESTAMPTZ NOT NULL,
  option_symbol TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fills_order_ts ON fills (order_id, ts);

