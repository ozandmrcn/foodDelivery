/* @file environment.d.ts — Typed env vars + Express.Request augmentation.
 * Re-opens existing interfaces via declaration merging so:
 *   1. process.env.* reads are typed strings (no repeated null checks)
 *   2. req.user is recognized everywhere WITHOUT casting
 *
 * @note Unlike the auth service, HERE req.user is only the DECODED JWT payload
 *   { userId, role } — no DB lookup happens in this service's middleware.
 */

import type { IUser } from "./index.ts";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      PORT: string;
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      RABBITMQ_URL: string;
      RATE_LIMIT_WINDOW: string;
      RATE_LIMIT_MAX_REQ: string;
    }
  }

  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

// Marks this file as a module so `declare global` applies project-wide.
export {};