/* @file utils/index.ts — catchAsync wrapper.
 * Forwards rejected Promises from async route handlers to the app.ts error
 * middleware via next(err). Without it, an async throw would crash the process.
 * (Express 5 handles async natively, but the pattern is idiomatic.)
 */

import type { RequestHandler } from "express";
import type { RouteParams } from "../types/index.ts";

/**
 * Wrap an async Express handler so rejected promises reach the error handler.
 * @param fn - An async (req, res, next) => Promise<any> handler
 * @returns A standard RequestHandler that calls .catch(next) on the promise
 */
const catchAsync = (fn: RouteParams): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;