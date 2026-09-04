import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  reservationsRouter
} from './routes/reservations.js';

import {
  errorHandler
} from './middleware/errorHandler.js';

import { config } from './config.js';
import { pool } from './db/pool.js';
import {
  productsRouter
} from './routes/products.js';

import crypto from 'node:crypto';
import pinoHttp from 'pino-http';
import {
  logger
} from './logger.js';

export const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(
  pinoHttp({
    logger,

    genReqId(req, res) {
      const incomingRequestId =
        req.headers['x-request-id'];

      const requestId =
        incomingRequestId ||
        crypto.randomUUID();

      res.setHeader(
        'X-Request-Id',
        requestId
      );

      return requestId;
    }
  })
);

app.use(
  cors({
    origin: config.CORS_ORIGIN
  })
);

app.use(
  express.json({
    limit: '10kb'
  })
);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'ok'
    });
  } catch {
    res.status(503).json({
      status: 'error',
      database: 'unavailable'
    });
  }
});

app.use(
  '/api/products',
  productsRouter
);

app.use(
  '/api/reservations',
  reservationsRouter
);

app.use(errorHandler);