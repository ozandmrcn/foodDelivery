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
