// ============================================================================
// 📌 CATCH-ASYNC UTILITY (utils/index.ts)
// ============================================================================
// WHAT IS catchAsync?
// -------------------
// A reusable wrapper that catches rejected Promises (errors) from any async
// route handler and forwards them to Express's error-handling middleware
// (the `(err, req, res, next)` function in app.ts).
//
// WHY is this needed?
// -------------------
// Express does NOT automatically catch errors thrown inside async functions.
// If an async route handler throws, the error is "unhandled" and crashes the
// process. `catchAsync` solves this by calling `.catch(next)` on the Promise.
//
// Usage:
//   router.get("/users", catchAsync(async (req, res) => {...}));
//
// Note: Express 5 (currently installed in this project) does handle async
// rejections automatically, so this wrapper is technically redundant now,
// but it is still common in codebases written for Express 4.
// ============================================================================

import type { RequestHandler } from "express";
import type { RouteParams } from "../types/index.ts";

const catchAsync = (fn: RouteParams): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
