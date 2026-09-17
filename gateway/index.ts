/* @file index.ts — API Gateway: the single entry point for clients.
 * Forwards every /api/* request to the matching internal microservice via
 * express-http-proxy (pure reverse proxy — no business logic lives here).
 */

import express from "express";
import proxy from "express-http-proxy";
import dotenv from "dotenv";

// @env Loads PORT + *_SERVICE_URL from .env into process.env
dotenv.config();

// @singleton The gateway is a plain Express app
const app = express();

// * Route Forwarding Rules
// ────────────────────────
// Each proxy strips the /api/<service> prefix and forwards the whole request
// (headers, cookies, body, query params) to the target service URL.
// E.g. GET /api/orders/123 -> http://<ORDER_SERVICE_URL>/orders/123

// ! Auth is NOT verified at the gateway — every service validates the JWT
//   itself (see each service's middleware.ts). One real-world option is to
//   verify tokens here once and keep services totally unaware of auth.
app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL));
app.use("/api/delivery", proxy(process.env.DELIVERY_SERVICE_URL));
app.use("/api/order", proxy(process.env.ORDER_SERVICE_URL));
app.use("/api/restaurants", proxy(process.env.RESTAURANTS_SERVICE_URL));

// @env PORT — local dev: http://localhost:3000
app.listen(process.env.PORT, () => {
  console.log(`⭐ API Gateway running on port: ${process.env.PORT} ⭐`);
});