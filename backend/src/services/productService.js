import { pool } from '../db/pool.js';

export async function listProducts() {
  const { rows } = await pool.query(`
    SELECT
      id,
      name,
      initial_quantity AS "initialQuantity",
      available_quantity AS "availableQuantity"
    FROM products
    ORDER BY id
  `);

  return rows;
}