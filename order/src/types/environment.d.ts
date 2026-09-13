// ============================================================================
// 📌 ENVIRONMENT & REQUEST TYPE AUGMENTATION (environment.d.ts)
// ============================================================================
// Thin wrapper: adds our env vars to NodeJS.ProcessEnv and augments
// Express.Request so that `req.user` is typed as { userId, role } for THIS
// service (unlike the auth service, which types req.user as full IUser).
//
// `declare global` + `export {}` (module marker) = declaration merging:
// we REOPEN the existing interfaces from @types/node and @types/express and
// add our custom fields. Without the module marker this silently does nothing.
// ============================================================================

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
      // NOTE: here only the DECODED PAYLOAD, not the full user document.
      user?: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

// Marks this file as a module so `declare global` works.
export {};
