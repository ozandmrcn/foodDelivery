// ============================================================================
// 📌 ENVIRONMENT & REQUEST TYPE AUGMENTATION (environment.d.ts)
// ============================================================================
// Adds the delivery service's env vars to NodeJS.ProcessEnv and augments
// Express.Request so `req.user` is typed as { userId, role } (decoded JWT
// payload, NOT the full document — unlike the auth service).
// Uses declaration merging: `declare global` re-opens existing interfaces.
// ============================================================================

import type { IUser, UserRole } from "./index.ts";

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

// Marks this file as a module so `declare global` works.
export {};
