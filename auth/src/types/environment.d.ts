/* @file environment.d.ts — Typed env vars + Express.Request augmentation.
 * Re-opens existing interfaces via declaration merging so:
 *   1. process.env.* reads are typed strings (no repeated null checks)
 *   2. req.user is recognized everywhere WITHOUT casting
 *
 * @note `declare global` only works inside a module — hence the export {}.
 *
 * @note Unlike order/delivery/restaurant, HERE req.user is the FULL IUser
 *   document (auth middleware loads it from the DB).
 */

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

// Marks this file as a module so `declare global` applies project-wide.
export {};