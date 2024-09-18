import type { Request, Response, NextFunction } from "express";

export function delayMiddleware(
  delayResponses?: number | { minimum: number; maximum: number }
) {
  const delayMin =
    typeof delayResponses === "number"
      ? delayResponses
      : delayResponses?.minimum;
  const delayMax =
    typeof delayResponses === "number" ? undefined : delayResponses?.maximum;

  return async function delayHandler(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (delayMin || delayMax) {
      let timeoutDuration = calculateTimeoutDuration(delayMin, delayMax);
      await new Promise<void>((resolve) => {
        let timeoutHandle: NodeJS.Timeout | undefined = undefined;

        const done = () => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          resolve();
        };

        timeoutHandle = setTimeout(done, timeoutDuration);
      });
    }
    next();
  };
}

function calculateTimeoutDuration(
  min: number | undefined,
  max: number | undefined
): number {
  if (max && !min) {
    // sets the timeout at +/- 20% of configured max
    return max * 0.8 + max * 0.4 * Math.random();
  } else if (min && !max) {
    // sets the timeout at +/- 20% of configured max
    return min * 0.8 + min * 0.4 * Math.random();
  } else if (max && min) {
    const timeoutRange = max - min;
    return min + timeoutRange * Math.random();
  }

  return 0;
}
