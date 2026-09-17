/* @file app.ts — Auth Service bootstrap entry point.
 * Standard microservice bootstrap: connect to its own DB -> global middleware ->
 * routes -> error handlers -> listen. Follows the database-per-service pattern.
 */

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./auth.routes.ts";

// @env Loads PORT, MONGODB_URI, JWT_*, RATE_LIMIT_* into process.env
dotenv.config();

// @singleton One Express app instance per service
const app = express();

// * Database Connection
// ---------------------
// @env MONGODB_URI — auth connects to food_delivery_auth.
// Microservice rule: each service owns a separate database and never shares
// one directly; cross-service traffic happens over HTTP/RabbitMQ only.
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`✅ Connected to MongoDB on ${process.env.MONGODB_URI}`);
  })
  .catch((error) => {
    console.error(`❌ Error connecting to MongoDB(${process.env.MONGODB_URI}):`, error);
  });

// * Rate Limiting
// ---------------
// ! Security: caps how many requests one IP may send per windowMs to defeat
//   brute-force login attacks. Env values arrive as strings -> parseInt().
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQ),
  message: "Too many requests from this IP, please try again later.",
});

// * Global Middleware Chain
// -------------------------
// @note Order matters — each app.use() runs for every request, in order:
//   body parsing -> cookies -> CORS -> security headers -> logging -> limit.
app.use(express.json()); // parses JSON request bodies -> req.body
app.use(cookieParser()); // parses the Cookie header -> req.cookies
app.use(cors()); // allows browsers from other origins to call us
app.use(helmet()); // sets secure HTTP headers
app.use(morgan("dev")); // logs every request to the console
app.use(limiter); // applies the rate limit defined above

// * Routes
// --------
// Paths in auth.routes.ts are relative to "/" (e.g. /register). The gateway
// proxies /api/auth -> this service, so /register becomes /api/auth/register.
app.use("/", authRoutes);

// * Error Handling
// ----------------
// @note A middleware with FOUR params is recognized by Express as an error
//   handler: any next(err) from routes lands here, returning clean JSON.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const message = err?.message || "Something went wrong!";
  console.log(message);
  res.status(500).json({ status: "fail", message });
});

// * Global 404 Handler
// --------------------
// Last stop: reaches here only when no route matched the request.
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// * Start Server
// --------------
// @env PORT — local dev: 3001 (process.env values are strings; Express accepts).
app.listen(process.env.PORT, () => {
  console.log(`⭐ Auth service is running on port ${process.env.PORT}`);
});

export default app;