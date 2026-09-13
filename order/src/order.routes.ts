// ============================================================================
// 📌 ORDER SERVICE — ROUTE DEFINITIONS (order.routes.ts)
// ============================================================================
// Maps HTTP verbs + paths to controller methods, applying middleware.
//
// MIDDLEWARE ORDER MATTERS:
// -------------------------
//   authenticate              -> verifies the JWT, fills req.user
//   authorize([...roles])     -> RBAC role check AFTER authenticate
// authenticate ALWAYS runs first; authorize then inspects req.user.role.
//
// WHO MAY DO WHAT (access matrix):
//   POST   /                      -> any logged-in customer
//   GET    /:orderId              -> any logged-in user
//   GET    /user/:userId          -> any logged-in user
//   PUT    /:orderId/status       -> admin + restaurant_owner ONLY
//                                    (customers can NOT change order status)
//
// NOTE: In the delivery/restaurant services the identical authenticate()
// middleware is duplicated. This is intentional in a microservice setup when
// there is no shared auth package — the JWT secret is the shared "contract".
// ============================================================================

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
