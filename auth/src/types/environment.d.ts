// ============================================================================
// 📌 ENVIRONMENT & REQUEST TYPE AUGMENTATION (environment.d.ts)
// ============================================================================
// Three things are declared here:
// 1. `NodeJS.ProcessEnv`  -> adds env vars to process.env (typed access).
// 2. `Express.Request.user` -> augments the Request type of Express so that
//    `req.user` is recognized everywhere WITHOUT casting.
//
// Declaration merging: `declare global` re-opens interfaces that already exist
// (NodeJS.ProcessEnv from @types/node, Express.Request from @types/express)
// and adds our custom fields. The `import` at the top + `export {}` at the
// bottom makes this file a module, which is REQUIRED for `declare global` to
// actually affect other files. (Gotcha: without module semantics, the global
// block silently does nothing.)
//
// Note: In THIS service `req.user` is the full IUser document (see middleware).
// In order/delivery/restaurant services it is only { userId, role }.
// ============================================================================

import type { IUser } from "./index.ts";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      PORT: string;
      RABBITMQ_URL: string;
      RATE_LIMIT_WINDOW: string;
      RATE_LIMIT_MAX_REQ: string;
    }
  }

  namespace Express {
    export interface Request {
      user?: IUser;
    }
  }
}

// Marks this file as a module so `declare global` works.
export {};
