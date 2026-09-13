// ============================================================================
// 📌 AUTH SERVICE — ROUTE DEFINITIONS (auth.routes.ts)
// ============================================================================
// WHAT DO ROUTES DO?
// ------------------
// Routes define the MAPPING between HTTP methods + URL paths and the
// controller functions that handle them. Example:
//   POST /register  ->  authController.register
//
// MIDDLEWARE IN ROUTES:
// ---------------------
// The optional second (or last before handler) argument is middleware that
// runs ONLY for that route. Here `authenticate` protects:
//   - /add-address  -> requires a valid JWT
//   - /profile      -> requires a valid JWT
//   - /register, /login, /refresh, /logout -> public (no token needed)
//
// HOW ROUTES CONNECT TO SERVICES:
// --------------------------------
// req -> route -> [middleware?] -> controller -> service -> model -> DB
// resp <--- (controller sends JSON back)
// ============================================================================

import express from "express";
import authController from "./auth.controller.ts";
import { authenticate } from "./auth.middleware.ts";

const router = express.Router();

// PUBLIC routes — anyone can call these without a token:
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

// PROTECTED routes — `authenticate` middleware runs first.
// If valid JWT is missing -> 401 is sent, controller never runs.
router.post("/add-address", authenticate, authController.addAddress);
router.get("/profile", authenticate, authController.getProfile);

export default router;
