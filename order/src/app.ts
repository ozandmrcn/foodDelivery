// ============================================================================
// 📌 ORDER SERVICE — APPLICATION ENTRY POINT (app.ts)
// ============================================================================
// ROLü IN THE ARCHITECTURE:
// -------------------------
// Same bootstrap template as the auth service (each microservice is a FULL
// independent Express app with its own port + its own database). This service
// is the ORDER SERVICE (port 3003) — it handles order creation/tracking and is
// the RABBITMQ PRODUCER side of the system.
//
// IMPORTANT FOR RECALL:
// ---------------------
// The bootstrap pattern is identical in every service. The DIFFERENCE between
// services comes from:
//   - Which routes are mounted (order.routes.ts)
//   - Which DATABASE it connects to (process.env.MONGODB_URI -> food_delivery_order)
//   - What business logic/services it wires up (order.service.ts + rabbitmq)
// So when you re-read this file, only glance at the custom parts below:
//   order middleware chain is the same security trio (helmet, morgan, ratelimit)
//   and the unique part is the `import orderRoutes`.
// ============================================================================

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import orderRoutes from "./order.routes.ts";

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
// -----------------
// Protects endpoints (e.g. order creation) from abuse/DoS — max N requests
// per window per IP, values from .env (strings -> parseInt).
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQ),
  message: "Too many requests from this IP, please try again later.",
});

// Middleware — each .use() runs on EVERY incoming request, in registration order:
//   1. express.json()   parse JSON body -> req.body
//   2. cookieParser()   parse cookies -> req.cookies
//   3. cors()           allow cross-origin browser calls
//   4. helmet()         security HTTP headers
//   5. morgan("dev")    request logging
//   6. limiter          rate limiting
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(limiter);

// Routes
app.use("/", orderRoutes);

// Error Handling
// -----------------
// 4-parameter signature = Express error handler. Any error routed via
// next(err) (e.g. from a rejected promise in catchAsync) lands here, so the
// process never crashes with an ugly stack trace to the client.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const message = err?.message || "Something went wrong!";
  console.log(message);
  res.status(500).json({ status: "fail", message });
});

// Global 404 Handler — registered after all routes: unmatched URLs get JSON 404.
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Start the server on its own port (3003).
app.listen(process.env.PORT, () => {
  console.log(`⭐ Order service is running on port ${process.env.PORT}`);
});

export default app;
