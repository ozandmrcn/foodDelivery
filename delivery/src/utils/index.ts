// ============================================================================
// 📌 CATCH-ASYNC UTILITY (utils/index.ts)
// ============================================================================
// Reusable wrapper: catches rejected Promises from async route handlers and
// forwards the error to the app.ts error middleware via next(error).
// Without it, an exception inside an async handler would crash the Node
// process. (Express 5 handles this natively, but the pattern is idiomatic.)
// ============================================================================

import type { RequestHandler } from "express";
import type { RouteParams } from "../types/index.ts";

const catchAsync = (fn: RouteParams): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
