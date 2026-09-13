// ============================================================================
// 📌 CATCH-ASYNC UTILITY (utils/index.ts)
// ============================================================================
// Wraps async route handlers so any rejected Promise is forwarded to the
// error-handling middleware (app.ts) via next(err). Without it, an async
// throw would crash the process. (Express 5 handles async natively, but the
// pattern is idiomatic from Express 4 codebases.)
// ============================================================================

import type { RequestHandler } from "express";
import type { RouteParams } from "../types/index.ts";

const catchAsync = (fn: RouteParams): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
