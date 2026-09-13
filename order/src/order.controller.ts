// ============================================================================
// 📌 ORDER SERVICE — CONTROLLER LAYER (order.controller.ts)
// ============================================================================
// HTTP interface layer: validate input -> call service -> send JSON response.
// No business logic here; look in order.service.ts for that.
//
// ROUTE -> CONTROLLER -> SERVICE -> MODEL(DB) -> [RabbitMQ publish] -> response
//
// Note the user identity: `req.user?.userId` is filled by the `authenticate`
// middleware which DECODES the JWT (no DB lookup). The user id is then used as
// the order's owner — the service trusts the signed token, not the body.
// ============================================================================

import { orderSchema, orderStatusSchema, validateDto } from "./order.dto.ts";
import OrderService from "./order.service.ts";
import catchAsync from "./utils/index.ts";

class OrderController {
  // POST /  -> create a new order (protected by authenticate)
  createOrder = catchAsync(async (req, res) => {
    // Validate req.body against the Zod schema (throws -> error handler).
    const orderData = await validateDto(orderSchema, req.body);

    // req.user comes from the JWT verification in the middleware. We NEVER
    // take the userId from the request body (a client could forge someone
    // else's order!).
    const result = await OrderService.createOrder(req.user?.userId as string, orderData);

    res.status(200).json(result);
  });

  // GET /:orderId -> fetch a single order (protected)
  getOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const result = await OrderService.getOrderById(orderId as string);

    if (!result) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.status(200).json(result);
  });

  // GET /user/:userId -> all orders of a user (protected)
  getUserOrders = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await OrderService.getUserOrders(userId as string);

    if (!result) {
      res.status(404).json({ message: "User's orders not found" });
      return;
    }

    res.status(200).json(result);
  });

  // PUT /:orderId/status -> advance order state (protected + role-checked)
  // Only admin / restaurant_owner can call this (see order.routes.ts).
  updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    // Validate the status string (must match the allowed enum in dto).
    const { status } = await validateDto(orderStatusSchema, req.body);

    const result = await OrderService.updateOrderStatus(orderId as string, status);

    if (!result) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.status(200).json({ order: result });
  });
}

export default new OrderController();
