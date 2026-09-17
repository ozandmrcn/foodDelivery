/* @file auth.routes.ts — Route table of the Auth service.
 * Maps HTTP verb + path to a controller handler, optionally guarded by the
 * `authenticate` middleware.
 */

import express from "express";
import authController from "./auth.controller.ts";
import { authenticate } from "./auth.middleware.ts";

const router = express.Router();

// * Public routes — anyone can call these without a token:
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

// * Protected routes — `authenticate` middleware runs first.
// Missing/invalid JWT -> 401, controller never runs.
router.post("/add-address", authenticate, authController.addAddress);
router.get("/profile", authenticate, authController.getProfile);

export default router;