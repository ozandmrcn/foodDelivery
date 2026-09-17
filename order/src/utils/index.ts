/* @file utils/index.ts — catchAsync wrapper.
 * Forwards rejected Promises from async route handlers to Express's central
 * error handler instead of crashing the process.
 */

import type { NextFunction, Request, Response, RequestHandler } from "express";
import type { RouteParams } from "../types/index.ts";

/**
 * Wrap an async Express handler so rejected promises reach the error handler.
 * @param fn - An async (req, res, next) => Promise<any> handler
 * @returns A standard RequestHandler that calls .catch(next) on the promise
 * @note Express 5 already catches async rejections, but this wrapper keeps
 *   handlers uniform and remains the norm in Express 4 codebases.
 */
const catchAsync = (fn: RouteParams): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;