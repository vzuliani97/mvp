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