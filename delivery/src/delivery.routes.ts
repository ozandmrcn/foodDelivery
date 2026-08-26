import express from "express";
import deliveryController from "./delivery.controller.ts";

const router = express.Router();

router.post("/register", deliveryController.register);
router.post("/login", deliveryController.login);

export default router;
