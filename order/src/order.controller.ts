import { orderSchema, orderStatusSchema, validateDto } from "./order.dto.ts";
import OrderService from "./order.service.ts";
import catchAsync from "./utils/index.ts";

class OrderController {
  createOrder = catchAsync(async (req, res) => {
    const orderData = await validateDto(orderSchema, req.body);

    const result = await OrderService.createOrder(req.user?.userId as string, orderData);

    res.status(200).json(result);
  });

  getOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const result = await OrderService.getOrderById(orderId as string);

    if (!result) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.status(200).json(result);
  });

  getUserOrders = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const result = await OrderService.getUserOrders(userId as string);

    if (!result) {
      res.status(404).json({ message: "User's orders not found" });
      return;
    }

    res.status(200).json(result);
  });

  updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
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
