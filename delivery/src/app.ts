/* @file app.ts — Delivery Service bootstrap entry point (port 3002).
 * Same bootstrap template as every service. This service manages COURIERS and
 * DELIVERY TRACKING, and is the RABBITMQ CONSUMER — its rabbitmq service starts
 * listening on boot so no order event is ever missed.
 */

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import deliveryRoutes from "./delivery.routes.ts";

// @env Loads PORT, MONGODB_URI, JWT_*, RABBITMQ_URL, RATE_LIMIT_* from .env
dotenv.config();

// @singleton One Express app per service
const app = express();

// * Database Connection
// ---------------------
// @env MONGODB_URI — delivery uses food_delivery_delivery (database-per-service).
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
// ! Security: caps requests per IP per windowMs. Env strings -> parseInt().
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQ),
  message: "Too many requests from this IP, please try again later.",
});

// * Global Middleware Chain
// -------------------------
// @note Same standard security/parsing chain as the other services.
app.use(express.json()); // parse JSON body -> req.body
app.use(cookieParser()); // parse cookies -> req.cookies
app.use(cors()); // allow cross-origin browser calls
app.use(helmet()); // security HTTP headers
app.use(morgan("dev")); // request logging
app.use(limiter); // rate limiting

// * Routes
// --------
app.use("/", deliveryRoutes);

// * Error Handling
// ----------------
// @note Four-parameter signature = error handler in Express.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const message = err?.message || "Something went wrong!";
  console.log(message);
  res.status(500).json({ status: "fail", message });
});

// * Global 404 Handler
// --------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// * Start Server
// --------------
// @env PORT — local dev: 3002
app.listen(process.env.PORT, () => {
  console.log(`⭐ Delivery service is running on port ${process.env.PORT}`);
});

export default app;