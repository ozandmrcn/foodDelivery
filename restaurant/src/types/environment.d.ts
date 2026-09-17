/* @file environment.d.ts — Typed env vars + Express.Request augmentation.
 * Re-opens existing interfaces via declaration merging so:
 *   1. process.env.* reads are typed strings (no repeated null checks)
 *   2. req.user is recognized everywhere WITHOUT casting
 *
 * @note Like order/delivery, req.user here is only the decoded JWT payload
 *   { userId, role } — no DB lookup in this service's middleware.
 */

import type { IUser, UserRole } from "./index.ts";

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
      user?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

// Marks this file as a module so `declare global` applies project-wide.
export {};