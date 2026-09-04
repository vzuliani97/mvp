import {
  Router
} from 'express';

import { z } from 'zod';

import {
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

      const reservation =
        await createReservation(
          parsed.data
        );

      res
        .status(201)
        .json({
          data: reservation
        });
    } catch (error) {
      next(error);
    }
  }
);