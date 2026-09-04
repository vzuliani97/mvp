import {
  Router
} from 'express';

import { z } from 'zod';

import {
  cancelReservation,
  createReservation,
  listReservations
} from '../services/reservationService.js';

import {
  AppError
} from '../utils/errors.js';


export const reservationsRouter =
  Router();


const createSchema = z
  .object({
    productId:
      z.number()
        .int()
        .positive(),

    quantity:
      z.number()
        .int()
        .positive()
  })
  .strict();

  const reservationIdSchema =
  z.string().uuid();


reservationsRouter.get(
  '/',
  async (req, res, next) => {
    try {
      const reservations =
        await listReservations();

      res.json({
        data: reservations
      });

    } catch (error) {
      next(error);
    }
  }
);


reservationsRouter.post(
  '/',
  async (req, res, next) => {
    try {

      // Primero valido que el body tenga
      // producto y cantidad válidos.
      const parsed =
        createSchema.safeParse(
          req.body
        );


      if (!parsed.success) {
        throw new AppError(
          400,
          'INVALID_INPUT',
          'Invalid reservation data'
        );
      }


      // Esta key identifica la operación.
      const idempotencyKey =
        req.get(
          'Idempotency-Key'
        );


      if (
        !idempotencyKey ||
        idempotencyKey.length > 128
      ) {
        throw new AppError(
          400,
          'INVALID_IDEMPOTENCY_KEY',
          'Idempotency-Key header is required'
        );
      }


      const result =
        await createReservation({
          ...parsed.data,
          idempotencyKey
        });


      res
        .status(
          result.replayed
            ? 200
            : 201
        )
        .json({
          data:
            result.reservation,

          meta: {
            replayed:
              result.replayed
          }
        });


    } catch (error) {
      next(error);
    }
  }
);

// NUEVO ENDPOINT DE CANCELACIÓN
reservationsRouter.post(
  '/:id/cancel',
  async (req, res, next) => {
    try {
      const parsedId =
        reservationIdSchema.safeParse(
          req.params.id
        );

      if (!parsedId.success) {
        throw new AppError(
          400,
          'INVALID_RESERVATION_ID',
          'Reservation id must be a UUID'
        );
      }

      const result =
        await cancelReservation({
          reservationId:
            parsedId.data
        });

      res.json({
        data:
          result.reservation,

        meta: {
          replayed:
            result.replayed
        }
      });

    } catch (error) {
      next(error);
    }
  }
);