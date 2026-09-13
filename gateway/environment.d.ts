// ============================================================================
// 📌 ENVIRONMENT TYPE DECLARATIONS (environment.d.ts)
// ============================================================================
// WHAT IS THIS FILE FOR?
// ----------------------
// By default `process.env.PORT` has type `string | undefined`, so TypeScript
// forces you to null-check it everywhere. This file tells TypeScript:
// "I declare that these env variables EXIST and are strings", which removes
// repeated `!` / optional-checking noise.
//
// `declare global` + `namespace NodeJS { interface ProcessEnv }` is a TypeScript
// feature called **Interface Merging / Declaration Merging**: we reopen an
// interface that @types/node already defined and ADD our own fields to it.
//
// The trailing `export {}` makes this a *module* (it imports/exports nothing
// else), which is REQUIRED — without it the `declare global` would not act
// globally. This is a common gotcha worth remembering!
//
// IMPORTANT: This only adds compile-time types. It does NOT validate that the
// variables actually exist at runtime — that part is still on you (.env file).
// ============================================================================

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

// Marks this file as a module (needed for `declare global` to work).
export {};
