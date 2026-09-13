// ============================================================================
// 📌 API GATEWAY (index.ts) — THE SINGLE FRONT DOOR
// ============================================================================
// WHAT IS AN API GATEWAY?
// -----------------------
// In a microservice architecture you have many services, each on its own port:
//   auth (3001), delivery (3002), order (3003), restaurant (3004).
// The client should NOT need to know about any of these ports. Instead the
// client talks to ONE public entry point -> THE GATEWAY (port 3000).
//
// WHY DO WE NEED IT?
// ------------------
// 1. Single URL for the client (http://localhost:3000/api/...)
// 2. A natural place to add cross-cutting concerns later:
//    - JWT validation on the edge before traffic reaches services
//    - Rate limiting, logging, request tracing, CORS
//    - Routing internal traffic, hiding internal service topology
// 3. You can change/scale internal services without the client noticing.
//
// HOW DOES IT WORK HERE?
// ----------------------
// We use `express-http-proxy`. It is pure reverse proxying: whatever comes to
// `api/<service>` is forwarded (with headers, cookies, body, query params)
// to the correct internal service URL, and the response is streamed back.
//
// NOTE: This gateway passes requests THROUGH without verifying the JWT.
// Authentication happens *inside* each service (see each service's
// middleware.ts). One real-world option is to verify tokens here once,
// which avoids duplicating the middleware in every service.
// ============================================================================

import express from "express";
import proxy from "express-http-proxy";
import dotenv from "dotenv";

// Load .env variables into process.env (PORT, *_SERVICE_URL).
dotenv.config();

// Create the express application (the gateway is also just an Express app).
const app = express();

// ROUTE FORWARDING RULES
// ----------------------
// express-http-proxy creates middleware that forwards the whole request to
// the target URL. E.g. GET /api/orders/123 coming to the gateway is proxied
// to http://<ORDER_SERVICE_URL>/orders/123 (the /api/orders prefix is stripped,
// so inside the Order service the route is defined WITHOUT the /api prefix).
app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL));
app.use("/api/delivery", proxy(process.env.DELIVERY_SERVICE_URL));
app.use("/api/order", proxy(process.env.ORDER_SERVICE_URL));
app.use("/api/restaurants", proxy(process.env.RESTAURANTS_SERVICE_URL));

// Start listening. Local dev: PORT=3000 in the gateway's .env file.
app.listen(process.env.PORT, () => {
  console.log(`⭐ API Gateway running on port: ${process.env.PORT} ⭐`);
});
