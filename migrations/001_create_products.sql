-- Products sold in the shop. Prices are stored in paise (Rs 1 = 100 paise).
CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  name             TEXT        NOT NULL UNIQUE,
  price_paise      INTEGER     NOT NULL CHECK (price_paise > 0),
  stock            INTEGER     NOT NULL CHECK (stock >= 0),      -- stock can never go below zero
  low_stock_limit  INTEGER     NOT NULL DEFAULT 5 CHECK (low_stock_limit >= 0),
  active           BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_active_name_idx ON products (active, name);
