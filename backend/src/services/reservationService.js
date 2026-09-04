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
  quantity,
  idempotencyKey
}) {
  return withTransaction(
    async (client) => {

                /*
        * Si dos requests dicen representar la misma
        * operación, dejo que uno termine antes de que
        * el segundo la evalúe.
        */
        await client.query(
        `
            SELECT pg_advisory_xact_lock(
            hashtextextended($1, 0)
            )
        `,
        [idempotencyKey]
        );

                const existing =
        await client.query(
            `
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

            WHERE r.idempotency_key = $1
            `,
            [idempotencyKey]
        );


        if (
        existing.rowCount > 0
        ) {
        const reservation =
            existing.rows[0];

        if (
            reservation.product_id
            !== productId
            ||
            reservation.quantity
            !== quantity
        ) {
            throw new AppError(
            409,
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency-Key was already used with different data'
            );
        }

        return {
            reservation:
            mapReservation(
                reservation
            ),

            replayed: true
        };
        }

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
              status,
              idempotency_key
            )

            VALUES (
              $1,
              $2,
              $3,
              'ACTIVE',
              $4
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
            quantity,
            idempotencyKey
          ]
        );

            return {
        reservation:
            mapReservation({
            ...inserted.rows[0],

            product_name:
                stockUpdate
                .rows[0]
                .name
            }),

        replayed: false
        };
    }
  );
}
export async function cancelReservation({
  reservationId
}) {
  return withTransaction(
    async (client) => {

      /*
       * Solo una reserva ACTIVE puede cambiar a CANCELLED.
       * Si ya fue cancelada, este UPDATE no modifica nada.
       */
      const cancelled =
        await client.query(
          `
            UPDATE reservations

            SET
              status = 'CANCELLED',
              cancelled_at = NOW()

            WHERE id = $1
              AND status = 'ACTIVE'

            RETURNING
              id,
              product_id,
              quantity,
              status,
              created_at,
              cancelled_at
          `,
          [reservationId]
        );


      if (cancelled.rowCount === 1) {
        const reservation =
          cancelled.rows[0];


        const product =
          await client.query(
            `
              UPDATE products

              SET
                available_quantity =
                  available_quantity + $1,

                updated_at = NOW()

              WHERE id = $2

              RETURNING
                name,
                available_quantity
            `,
            [
              reservation.quantity,
              reservation.product_id
            ]
          );


        return {
          reservation:
            mapReservation({
              ...reservation,
              product_name:
                product.rows[0].name
            }),

          replayed: false
        };
      }


      const existing =
        await client.query(
          `
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

            WHERE r.id = $1
          `,
          [reservationId]
        );


      if (existing.rowCount === 0) {
        throw new AppError(
          404,
          'RESERVATION_NOT_FOUND',
          'Reservation not found'
        );
      }


      return {
        reservation:
          mapReservation(
            existing.rows[0]
          ),

        replayed: true
      };
    }
  );
}