/* @file delivery.routes.ts — Route table of the Delivery service.
 * Access matrix (who can call what):
 *   POST  /couriers/register         -> public
 *   POST  /couriers/login            -> public
 *   PATCH /couriers/status           -> courier (own availability)
 *   GET   /couriers/:courierId/performance -> admin
 *   GET   /orders                    -> courier (unclaimed orders)
 *   POST  /orders/:orderId/accept    -> courier (claim an order)
 *   PATCH /orders/:orderId/status    -> courier (progress updates)
 *   GET   /orders/:orderId/tracking  -> ANY logged-in user (customer watches)
 *
 * @note authenticate() first (fills req.user), then authorize() checks the role.
 */

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