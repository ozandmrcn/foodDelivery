/* @file order.controller.ts — HTTP interface layer of the Order service.
 * Only: validate input -> call service -> send JSON. Business logic lives in
 * order.service.ts. User identity comes from `req.user?.userId` (JWT payload) —
 * never from the request body.
 */

import { orderSchema, orderStatusSchema, validateDto } from "./order.dto.ts";
import OrderService from "./order.service.ts";
import catchAsync from "./utils/index.ts";

class OrderController {
  // @route POST / — create an order (protected by authenticate)
  createOrder = catchAsync(async (req, res) => {
    const orderData = await validateDto(orderSchema, req.body);

    // ! userId comes from the verified JWT, NOT from the body — otherwise a
    //   client could forge another user's order.
    const result = await OrderService.createOrder(req.user?.userId as string, orderData);

    res.status(200).json(result);
  });

  // @route GET /:orderId — fetch a single order (protected)
  getOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const result = await OrderService.getOrderById(orderId as string);

    if (!result) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.status(200).json(result);
  });

  // @route GET /user/:userId — all orders of a user (protected)
  getUserOrders = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await OrderService.getUserOrders(userId as string);

    if (!result) {
      res.status(404).json({ message: "User's orders not found" });
      return;
    }

    res.status(200).json(result);
  });

  // @route PUT /:orderId/status — advance the state machine (protected + RBAC)
  // @rbac Only admin / restaurant_owner (see order.routes.ts).
  updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    // Validate the status against the allowed enum in the dto.
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