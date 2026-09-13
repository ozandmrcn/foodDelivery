// ============================================================================
// 📌 DELIVERY SERVICE — APPLICATION ENTRY POINT (app.ts)
// ============================================================================
// ROLü IN THE ARCHITECTURE:
// -------------------------
// Same bootstrap template as all services (own Express app, own port 3002,
// own MongoDB database). This service manages COURIERS and DELIVERY TRACKING.
//
// MICROSERVICE LESSON — THE ONLY MEANINGFUL DIFFERENCE:
// -----------------------------------------------------
// All four app.ts files are ~identical. What makes THIS service special is
// wired INSIDE:
//   - delivery.routes.ts  (courier + delivery endpoints)
//   - delivery.service.ts
//   - rabbitmq.service.ts with `listenToDeliveryQueue()` — because the delivery
//     service is the RABBITMQ CONSUMER (it reacts to events published by the
//     order service). Its constructor kicks off `rabbitmqService.initialize()`
//     at startup so it is already listening when events arrive.
// ============================================================================

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import deliveryRoutes from "./delivery.routes.ts";

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

// Middleware — same standard Express security/parsing chain as the other services:
// JSON body -> cookie parser -> CORS -> security headers -> request log -> limiter
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(limiter);

// Routes
app.use("/", deliveryRoutes);

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

// Start the server on its own port (3002).
app.listen(process.env.PORT, () => {
  console.log(`⭐ Delivery service is running on port ${process.env.PORT}`);
});

export default app;
