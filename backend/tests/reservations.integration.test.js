import crypto from 'node:crypto';

import request from 'supertest';

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import {
  app
} from '../src/app.js';

import {
  pool
} from '../src/db/pool.js';


/*
 * Pruebas de integración principales.
 *
 * Se cubren 6 escenarios porque son los que pueden generar
 * inconsistencias reales en inventario o reservas:
 *
 * 1. Dos reservas concurrentes no pueden sobre-vender stock.
 * 2. Repetir la misma operación no debe descontar inventario dos veces.
 * 3. Se debe poder reservar exactamente todo el inventario disponible.
 * 4. Una Idempotency-Key no puede reutilizarse con datos diferentes.
 * 5. Cancelar dos veces debe devolver inventario una sola vez.
 * 6. El backend debe rechazar cantidades inválidas aunque se salte el frontend.
 *
 * Las pruebas usan la API real de Express y PostgreSQL para validar
 * el comportamiento completo y no solamente funciones aisladas.
 */


async function resetDatabase() {
  await pool.query(
    'DELETE FROM reservations'
  );

  await pool.query(`
    UPDATE products
    SET
      available_quantity = initial_quantity,
      updated_at = NOW()
  `);
}


async function productByName(name) {
  const { rows } =
    await pool.query(
      `
        SELECT
          id,
          initial_quantity,
          available_quantity
        FROM products
        WHERE name = $1
      `,
      [name]
    );

  return rows[0];
}


beforeEach(async () => {
  await resetDatabase();
});


afterAll(async () => {
  await pool.end();
});


describe(
  'reservation business rules',
  () => {

    // 1. Dos solicitudes compiten por el mismo stock.
    it(
      'never oversells with concurrent requests',
      async () => {
        const product =
          await productByName(
            'Consola portátil'
          );

        const [first, second] =
          await Promise.all([
            request(app)
              .post('/api/reservations')
              .set(
                'Idempotency-Key',
                crypto.randomUUID()
              )
              .send({
                productId: product.id,
                quantity: 4
              }),

            request(app)
              .post('/api/reservations')
              .set(
                'Idempotency-Key',
                crypto.randomUUID()
              )
              .send({
                productId: product.id,
                quantity: 4
              })
          ]);

        expect(
          [
            first.status,
            second.status
          ].sort()
        ).toEqual(
          [201, 409]
        );

        const current =
          await productByName(
            'Consola portátil'
          );

        expect(
          current.available_quantity
        ).toBe(1);
      }
    );


    // 2. Un retry de la misma operación debe devolver la reserva existente.
    it(
      'replays the same request without discounting twice',
      async () => {
        const product =
          await productByName(
            'Consola portátil'
          );

        const key =
          crypto.randomUUID();

        const [first, second] =
          await Promise.all([
            request(app)
              .post('/api/reservations')
              .set(
                'Idempotency-Key',
                key
              )
              .send({
                productId: product.id,
                quantity: 2
              }),

            request(app)
              .post('/api/reservations')
              .set(
                'Idempotency-Key',
                key
              )
              .send({
                productId: product.id,
                quantity: 2
              })
          ]);

        expect(
          [
            first.status,
            second.status
          ].sort()
        ).toEqual(
          [200, 201]
        );

        expect(
          first.body.data.id
        ).toBe(
          second.body.data.id
        );

        const current =
          await productByName(
            'Consola portátil'
          );

        expect(
          current.available_quantity
        ).toBe(3);
      }
    );


    // 3. Caso límite: reservar exactamente todo el inventario disponible.
    it(
      'allows reserving exactly all available inventory',
      async () => {
        const product =
          await productByName(
            'Consola portátil'
          );

        const response =
          await request(app)
            .post('/api/reservations')
            .set(
              'Idempotency-Key',
              crypto.randomUUID()
            )
            .send({
              productId: product.id,
              quantity:
                product.initial_quantity
            });

        expect(
          response.status
        ).toBe(201);

        const current =
          await productByName(
            'Consola portátil'
          );

        expect(
          current.available_quantity
        ).toBe(0);
      }
    );


    // 4. La misma key no puede representar dos operaciones diferentes.
    it(
      'rejects reuse of a key with different data',
      async () => {
        const product =
          await productByName(
            'Consola portátil'
          );

        const key =
          crypto.randomUUID();

        await request(app)
          .post('/api/reservations')
          .set(
            'Idempotency-Key',
            key
          )
          .send({
            productId: product.id,
            quantity: 1
          });

        const response =
          await request(app)
            .post('/api/reservations')
            .set(
              'Idempotency-Key',
              key
            )
            .send({
              productId: product.id,
              quantity: 2
            });

        expect(
          response.status
        ).toBe(409);

        expect(
          response.body.error.code
        ).toBe(
          'IDEMPOTENCY_KEY_REUSED'
        );
      }
    );


    // 5. Repetir una cancelación no puede incrementar stock dos veces.
    it(
      'cancelling twice restores inventory only once',
      async () => {
        const product =
          await productByName(
            'Consola portátil'
          );

        const created =
          await request(app)
            .post('/api/reservations')
            .set(
              'Idempotency-Key',
              crypto.randomUUID()
            )
            .send({
              productId: product.id,
              quantity: 2
            });

        const reservationId =
          created.body.data.id;

        const first =
          await request(app)
            .post(
              `/api/reservations/${reservationId}/cancel`
            );

        const second =
          await request(app)
            .post(
              `/api/reservations/${reservationId}/cancel`
            );

        expect(
          first.status
        ).toBe(200);

        expect(
          second.body.meta.replayed
        ).toBe(true);

        const current =
          await productByName(
            'Consola portátil'
          );

        expect(
          current.available_quantity
        ).toBe(5);
      }
    );


    // 6. El backend debe protegerse aunque el cliente envíe datos manipulados.
    it(
      'rejects invalid quantities in the backend',
      async () => {
        const product =
          await productByName(
            'Consola portátil'
          );

        const response =
          await request(app)
            .post('/api/reservations')
            .set(
              'Idempotency-Key',
              crypto.randomUUID()
            )
            .send({
              productId: product.id,
              quantity: 0
            });

        expect(
          response.status
        ).toBe(400);

        expect(
          response.body.error.code
        ).toBe(
          'INVALID_INPUT'
        );
      }
    );

  }
);