/* @file app.ts — Restaurant Service bootstrap entry point (port 3004).
 * Fourth microservice: a classic CRUD service for restaurants + menu items.
 *
 * @note NOT every service needs RabbitMQ — unlike order (producer) and
 *   delivery (consumer), this service has no bus at all. Reasoning: an event
 *   only matters when SOMEONE ELSE has to react. A new restaurant/menu item
 *   needs no notification elsewhere (order service only stores restaurantId).
 *   RabbitMQ is a tool, not a rule.
 */

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import restaurantRoutes from "./restaurant.routes.ts";

// @env Loads PORT, MONGODB_URI, JWT_*, RATE_LIMIT_* from .env
dotenv.config();

// @singleton One Express app per service
const app = express();

// * Database Connection
// ---------------------
// @env MONGODB_URI — restaurant uses food_delivery_restaurant (database-per-service).
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
// @note Standard Express chain (see auth/order/delivery app.ts for details).
app.use(express.json()); // parse JSON body -> req.body
app.use(cookieParser()); // parse cookies -> req.cookies
app.use(cors()); // allow cross-origin browser calls
app.use(helmet()); // security HTTP headers
app.use(morgan("dev")); // request logging
app.use(limiter); // rate limiting

// * Routes
// --------
app.use("/", restaurantRoutes);

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
// @env PORT — local dev: 3004
app.listen(process.env.PORT, () => {
  console.log(`⭐ Restaurant service is running on port ${process.env.PORT}`);
});

export default app;