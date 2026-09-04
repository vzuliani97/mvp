import crypto from 'node:crypto';

import {
  pool,
  withTransaction
} from '../db/pool.js';

import {
  AppError
} from '../utils/errors.js';


function mapReservation(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at
  };
}


export async function listReservations() {
  const { rows } = await pool.query(`
    SELECT
      r.id,
      r.product_id,
      p.name AS product_name,
      r.quantity,
      r.status,
      r.created_at,
      r.cancelled_at

    FROM reservations r

    JOIN products p
      ON p.id = r.product_id

    ORDER BY r.created_at DESC
  `);

  return rows.map(mapReservation);
}


export async function createReservation({
  productId,
  quantity
}) {
  return withTransaction(
    async (client) => {

      /*
       * Descuento el stock y valido disponibilidad
       * en la misma operación para no dejar una
       * ventana entre leer y actualizar WHERE id = $2 
              AND available_quantity >= $1.
       */
      const stockUpdate =
        await client.query(
          `
            UPDATE products

            SET
              available_quantity =
                available_quantity - $1,

              updated_at = NOW()

            WHERE id = $2 
              AND available_quantity >= $1

            RETURNING
              id,
              name,
              available_quantity
          `,
          [
            quantity,
            productId
          ]
        );

      if (
        stockUpdate.rowCount === 0
      ) {
        const product =
          await client.query(
            `
              SELECT
                id,
                available_quantity

              FROM products

              WHERE id = $1
            `,
            [productId]
          );

        if (
          product.rowCount === 0
        ) {
          throw new AppError(
            404,
            'PRODUCT_NOT_FOUND',
            'Product not found'
          );
        }

        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          'Not enough inventory available',
          {
            availableQuantity:
              product.rows[0]
                .available_quantity
          }
        );
      }

      const id =
        crypto.randomUUID();

      const inserted =
        await client.query(
          `
            INSERT INTO reservations (
              id,
              product_id,
              quantity,
              status
            )

            VALUES (
              $1,
              $2,
              $3,
              'ACTIVE'
            )

            RETURNING
              id,
              product_id,
              quantity,
              status,
              created_at,
              cancelled_at
          `,
          [
            id,
            productId,
            quantity
          ]
        );

      return mapReservation({
        ...inserted.rows[0],

        product_name:
          stockUpdate.rows[0].name
      });
    }
  );
}