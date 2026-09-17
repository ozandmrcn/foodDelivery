/* @file utils/index.ts — catchAsync wrapper.
 * Forwards rejected Promises from async route handlers to the app.ts error
 * middleware via next(error) — without it, an exception inside an async
 * handler would crash the Node process.
 */

import type { RequestHandler } from "express";
import type { RouteParams } from "../types/index.ts";

/**
 * Wrap an async Express handler so rejected promises reach the error handler.
 * @param fn - An async (req, res, next) => Promise<any> handler
 * @returns A standard RequestHandler that calls .catch(next) on the promise
 * @note Express 5 already catches async rejections, but the pattern is idiomatic.
 */
const catchAsync = (fn: RouteParams): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;