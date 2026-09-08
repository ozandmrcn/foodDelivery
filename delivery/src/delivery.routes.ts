import express from "express";
import deliveryController from "./delivery.controller.ts";
import { authenticate, authorize } from "./delivery.middleware.ts";

const router = express.Router();

router.post("/couriers/register", deliveryController.register);
router.post("/couriers/login", deliveryController.login);
router.patch("/couriers/status", authenticate, authorize(["courier"]), deliveryController.updateCourierStatus);
router.get(
  "/couriers/:courierId/performance",
  authenticate,
  authorize(["admin"]),
  deliveryController.getCourierPerformance,
);

router.get("/orders", authenticate, authorize(["courier"]), deliveryController.getAvailableOrders);
router.post("/orders/:orderId/accept", authenticate, authorize(["courier"]), deliveryController.acceptDelivery);
router.patch("/orders/:orderId/status", authenticate, authorize(["courier"]), deliveryController.updateDeliveryStatus);
router.get("/orders/:orderId/tracking", authenticate, deliveryController.trackDelivery);

export default router;
