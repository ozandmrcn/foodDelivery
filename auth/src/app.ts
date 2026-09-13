// ============================================================================
// 📌 AUTH SERVICE — APPLICATION ENTRY POINT (app.ts)
// ============================================================================
// RÖLE IN THE ARCHITECTURE:
// -------------------------
// This is one microservice of the food delivery system. Every microservice has
// the SAME bootstrap structure (copy-pasted): create Express app -> connect to
// its OWN MongoDB database -> mount middleware -> mount routes -> handle errors
// -> listen on its own port (auth = 3001).
//
// MICROSERVICE RULE #1 — "Database per service":
// Written on purpose: each service connects to a DIFFERENT Mongo database
// (food_delivery_auth, food_delivery_order, ...) and manages only its own data.
// Services NEVER share a database directly; they talk over HTTP/RabbitMQ.
//
// WHY IS THIS BOOTSTRAP FILE IMPORTANT TO REMEMBER?
// -------------------------------------------------
// 1. Middleware ORDER matters: JSON parser runs BEFORE routes, error handler
//    runs LAST. Express executes middleware in registration order.
// 2. The error-handling middleware signature MUST have 4 params (err, req, res,
//    next) otherwise Express does not recognize it as an error handler.
// 3. The 404 catch-all must be registered AFTER the routes, before/after the
//    error handler, so unknown URLs get a JSON 404.
// ============================================================================

import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./auth.routes.ts";

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
// PROTECTION: limits how many requests one IP can send within `windowMs`.
// Prevents brute-force attacks on the login endpoint (the classic
// "try every password" attack). Values come from the .env file.
// Note: `ratelimit` values are Strings in .env, so parseInt() converts them.
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQ),
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
// -----------------
// Each app.use() line "proceses" every incoming request in order:
// 1. express.json()  -> parses JSON request bodies into req.body
// 2. cookieParser()  -> parses the Cookie header into req.cookies
// 3. cors()          -> allows browsers from other origins to call us
// 4. helmet()        -> sets security HTTP headers (X-Frame-Options, etc.)
// 5. morgan("dev")   -> LOGS every request to the console (dev format)
// 6. limiter         -> applies the rate limit defined above
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(limiter);

// Routes
// -----------------
// Mount auth routes. The router in auth.routes.ts defines the paths
// relative to "/" (e.g. "/register" becomes "/register").
app.use("/", authRoutes);

// Error Handling
// -----------------
// A middleware with 4 parameters is an ERROR HANDLER (Express detects it by
// the signature). Any error passed to `next(err)` inside a route lands here.
// This prevents the server from crashing and returns a clean JSON error.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const message = err?.message || "Something went wrong!";
  console.log(message);
  res.status(500).json({ status: "fail", message });
});

// Global 404 Handler
// -----------------
// Last middleware: if the request reached here, no route matched it.
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Start the server
// -----------------
// process.env.PORT = "3001" (string) -> Express accepts it directly.
app.listen(process.env.PORT, () => {
  console.log(`⭐ Auth service is running on port ${process.env.PORT}`);
});

export default app;
