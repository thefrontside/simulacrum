import type { Operation } from "effection";
import { race, sleep } from "effection";

/**
 * Either a succesfully computed value, or one that took too long to complete.
 */
export type Timeboxed<T> = Completed<T> | Timeout;

/**
 * A value successfully computed within the timeout window. It has metadata about how long it
 * took.
 */
export interface Completed<T> {
  /**
   * false: indicates that there was no timeout and that value was successfully computed
   */
  readonly timeout: false;

  /**
   * The actual value
   */
  readonly value: T;

  /**
   * The time that the operation began;
   */
  readonly start: DOMHighResTimeStamp;

  /**
   * The time that the operation succesfully returned value
   */
  readonly end: DOMHighResTimeStamp;
}

/**
 * A value that did not compute within the alloted window.
 */
export interface Timeout {
  /**
   * true: indicates that this is a timed out result and no value is available
   */
  readonly timeout: true;

  /**
   * The time that the operation began;
   */
  readonly start: DOMHighResTimeStamp;

  /**
   * The time that the operation succesfully returned value
   */
  readonly end: DOMHighResTimeStamp;
}

/**
 * Constrain `operation` to complete within `limitMS` milliseconds
 *
 * @example
 * ```ts
 * import { timebox } from "@effectionx/timebox";
 * import { handleRequest } from "./handle-request";

 * // a theoretical request handler
 * export function* handler(request: Request): Operation<Response> {
 *   // do not let the handler run for more than 10 seconds
 *   let result = yield* timebox(10000, () => handleRequest(request));
 *   if (result.timeout) {
 *     return new Response(504, "Gateway Timeout");
 *   } else {
 *     return result.value;
 *   }
 * }
 * ```
 * @param limitMS - the maximum allowable time for `operation` to complete
 * @param operation - the operation to attempt
 * @returns either a completed value or a timeout
 */
export function timebox<T>(
  limitMS: number,
  operation: () => Operation<T>,
): Operation<Timeboxed<T>> {
  return race([complete(operation), deadline(limitMS)]);
}

function* deadline(limitMS: number): Operation<Timeout> {
  let start = performance.now();
  yield* sleep(limitMS);
  return { timeout: true, start, end: performance.now() };
}

function* complete<T>(op: () => Operation<T>): Operation<Completed<T>> {
  let start = performance.now();
  return { timeout: false, value: yield* op(), start, end: performance.now() };
}
