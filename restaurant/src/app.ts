// ============================================================================
// 📌 RESTAURANT SERVICE — APPLICATION ENTRY POINT (app.ts)
// ============================================================================
// Fourth microservice, port 3004. Manages RESTAURANTS and their MENU ITEMS
// (a classic CRUD service).
//
// MICROSERVICE LESSON — NOT EVERY SERVICE NEEDS RABBITMQ:
// --------------------------------------------------------
// Unlike order (producer) and delivery (consumer), THIS service has no
// rabbitmq.service.ts at all. It is purely a REST API over its own database.
// Think about WHY that is the right call here:
//   - An event only makes sense when SOMEONE ELSE has to react to it.
//   - A new restaurant / new menu item does not need a notification anywhere
//     else in this system *yet* — the order service only stores restaurantId.
// This is a good reminder: RabbitMQ is a tool, not a rule. You subscribe a
// service to an event ONLY when being informed matters to that service.
// ============================================================================

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import restaurantRoutes from "./restaurant.routes.ts";

// Load environment variables
dotenv.config();

// Create an express application
const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`✅ Connected to MongoDB on ${process.env.MONGODB_URI}`);
  })
  .catch((error) => {
    console.error(`❌ Error connecting to MongoDB(${process.env.MONGODB_URI}):`, error);
  });

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQ),
  message: "Too many requests from this IP, please try again later.",
});

// Middleware — the standard Express chain (see auth/order/delivery for details):
// JSON body -> cookies -> CORS -> security headers -> request log -> rate limit
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(limiter);

// Routes
app.use("/", restaurantRoutes);

// Error Handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const message = err?.message || "Something went wrong!";
  console.log(message);
  res.status(500).json({ status: "fail", message });
});

// Global 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Start the server on its own port (3004).
app.listen(process.env.PORT, () => {
  console.log(`⭐ Restaurant service is running on port ${process.env.PORT}`);
});

export default app;
