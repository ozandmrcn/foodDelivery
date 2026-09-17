/* @file environment.d.ts — Typed environment variables for the gateway.
 * Re-opens NodeJS.ProcessEnv via declaration merging so `process.env.PORT`
 * etc. are typed as strings instead of `string | undefined`.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      AUTH_SERVICE_URL: string;
      DELIVERY_SERVICE_URL: string;
      ORDER_SERVICE_URL: string;
      RESTAURANTS_SERVICE_URL: string;
    }
  }
}

// @note The `export {}` marks this file as a module — REQUIRED for the
//   `declare global` block to actually apply type-wide.
export {};