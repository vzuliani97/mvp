CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,

  initial_quantity INTEGER NOT NULL
    CHECK (initial_quantity >= 0),

  available_quantity INTEGER NOT NULL
    CHECK (
      available_quantity >= 0
      AND available_quantity <= initial_quantity
    ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY,

  product_id INTEGER NOT NULL
    REFERENCES products(id),

  quantity INTEGER NOT NULL
    CHECK (quantity > 0),

  status VARCHAR(16) NOT NULL
    DEFAULT 'ACTIVE'
    CHECK (
      status IN ('ACTIVE', 'CANCELLED')
    ),

    idempotency_key VARCHAR(128)
  NOT NULL UNIQUE,

  created_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW(),

  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS
  idx_reservations_product_id
ON reservations(product_id);

CREATE INDEX IF NOT EXISTS
  idx_reservations_status
ON reservations(status);

INSERT INTO products (
  name,
  initial_quantity,
  available_quantity
)
VALUES
  ('Consola portátil', 5, 5),
  ('Audífonos inalámbricos', 10, 10),
  ('Teclado mecánico', 8, 8)
ON CONFLICT (name) DO NOTHING;