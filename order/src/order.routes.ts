/* @file order.routes.ts — Route table of the Order service.
 * Maps HTTP verb + path to controller handlers with middleware.
 *
 * Access matrix:
 *   POST /                  -> any logged-in customer
 *   GET  /:orderId          -> any logged-in user
 *   GET  /user/:userId      -> any logged-in user
 *   PUT  /:orderId/status   -> admin + restaurant_owner ONLY (RBAC)
 *
 * @note authenticate() is duplicated per service (no shared auth package) —
 *   the shared JWT secret is the implicit contract between services.
 */

import express from "express";
import orderController from "./order.controller.ts";
import { authenticate, authorize } from "./order.middleware.ts";

const router = express.Router();

router.post("/", authenticate, orderController.createOrder);
router.get("/:orderId", authenticate, orderController.getOrder);
router.get("/user/:userId", authenticate, orderController.getUserOrders);
router.put(
  "/:orderId/status",
  authenticate,
  authorize(["admin", "restaurant_owner"]),
  orderController.updateOrderStatus,
);

export default router;