import type { Request, Response, NextFunction } from 'express';

export function defaultErrorHandler(error: Error, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(error);
  }

  let assertCondition = 'Assert condition failed: ';

  if (error?.message?.startsWith(assertCondition)) {
    let errorCode = 500;
    let errorResponse = error.message;

    if (error.message.includes('::')) {
      let errorMessage = error.message.slice(assertCondition.length);
      errorCode = parseInt(errorMessage.slice(0, 3));
      errorResponse = errorMessage.slice(5);
    }

    res.status(errorCode).send(errorResponse);
  } else {
    console.error(error);
    res
      .status(500)
      .json({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
  }
}
