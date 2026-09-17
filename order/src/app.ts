/* @file app.ts — Order Service bootstrap entry point (port 3003).
 * Same bootstrap template as every service: own DB -> middleware -> routes ->
 * error handlers -> listen. This service is the RabbitMQ PRODUCER side.
 */

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import orderRoutes from "./order.routes.ts";

// @env Loads PORT, MONGODB_URI, JWT_*, RABBITMQ_URL, RATE_LIMIT_* from .env
dotenv.config();

// @singleton One Express app per service
const app = express();

// * Database Connection
// ---------------------
// @env MONGODB_URI — order uses food_delivery_order (database-per-service).
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
// ! Security: caps requests per IP per windowMs to fight abuse/DoS on order
//   creation. Env values arrive as strings -> parseInt().
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQ),
  message: "Too many requests from this IP, please try again later.",
});

// * Global Middleware Chain
// -------------------------
// @note Registration order = execution order for EVERY request.
app.use(express.json()); // parse JSON body -> req.body
app.use(cookieParser()); // parse cookies -> req.cookies
app.use(cors()); // allow cross-origin browser calls
app.use(helmet()); // security HTTP headers
app.use(morgan("dev")); // request logging
app.use(limiter); // rate limiting

// * Routes
// --------
app.use("/", orderRoutes);

// * Error Handling
// ----------------
// @note Four-parameter signature = error handler in Express; next(err) from
//   routes (via catchAsync) lands here as clean JSON, never a stack-trace crash.
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
// @env PORT — local dev: 3003
app.listen(process.env.PORT, () => {
  console.log(`⭐ Order service is running on port ${process.env.PORT}`);
});

export default app;