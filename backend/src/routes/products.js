import { Router } from 'express';

import {
  listProducts
} from '../services/productService.js';

export const productsRouter = Router();

productsRouter.get(
  '/',
  async (req, res, next) => {
    try {
      const products =
        await listProducts();

      res.json({
        data: products
      });
    } catch (error) {
      next(error);
    }
  }
);