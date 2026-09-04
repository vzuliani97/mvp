import {
  AppError
} from '../utils/errors.js';


export function errorHandler(
  error,
  req,
  res,
  next
) {
  if (
    error instanceof AppError
  ) {
    req.log?.warn(
      {
        code: error.code,
        details: error.details
      },
      'request_rejected'
    );

    return res
      .status(error.statusCode)
      .json({
        error: {
          code: error.code,
          message: error.message,

          ...(error.details
            ? {
                details:
                  error.details
              }
            : {})
        }
      });
  }


  req.log?.error(
    {
      err: error
    },
    'unexpected_error'
  );


  return res
    .status(500)
    .json({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          'Unexpected server error'
      }
    });
}