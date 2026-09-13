// ============================================================================
// 📌 ENVIRONMENT & REQUEST TYPE AUGMENTATION (environment.d.ts)
// ============================================================================
// Adds the restaurant service's env vars to NodeJS.ProcessEnv and augments
// Express.Request so `req.user` is typed as { userId, role } (decoded JWT
// payload only). `declare global` + module marker (`export {}`) re-opens the
// existing interfaces — declaration merging.
// ============================================================================

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

// Marks this file as a module so `declare global` works.
export {};
