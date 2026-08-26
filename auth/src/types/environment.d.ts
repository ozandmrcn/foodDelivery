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

export {};
