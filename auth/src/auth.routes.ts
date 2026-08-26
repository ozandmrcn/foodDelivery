import express from "express";
import authController from "./auth.controller.ts";
import { authenticate } from "./auth.middleware.ts";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);
router.post("/add-address", authenticate, authController.addAddress);
router.get("/profile", authenticate, authController.getProfile);

export default router;
