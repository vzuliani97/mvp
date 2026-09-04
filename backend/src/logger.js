import pino from 'pino';

import {
  config
} from './config.js';


export const logger = pino({
  level: config.LOG_LEVEL,

  // Evito guardar headers sensibles en los logs.
  redact: [
    'req.headers.authorization',
    'req.headers.cookie'
  ]
});