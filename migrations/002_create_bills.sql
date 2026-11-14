-- A bill and its line items. product_name and unit_price_paise are copied
-- at billing time so old bills stay correct even if a product is renamed
-- or its price changes later.
CREATE TABLE bills (
  id           SERIAL PRIMARY KEY,
  total_paise  INTEGER     NOT NULL CHECK (total_paise >= 0),
  item_count   INTEGER     NOT NULL CHECK (item_count > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bills_created_at_idx ON bills (created_at);

CREATE TABLE bill_items (
  id                SERIAL PRIMARY KEY,
  bill_id           INTEGER NOT NULL REFERENCES bills (id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products (id),
  product_name      TEXT    NOT NULL,
  unit_price_paise  INTEGER NOT NULL CHECK (unit_price_paise > 0),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  line_total_paise  INTEGER NOT NULL CHECK (line_total_paise >= 0)
);

CREATE INDEX bill_items_bill_id_idx ON bill_items (bill_id);
