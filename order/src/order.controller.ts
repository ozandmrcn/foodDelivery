import OrderService from "./order.service.ts";
import catchAsync from "./utils/index.ts";

class OrderController {
  createOrder = catchAsync(async (req, res) => {
    const result = await OrderService.createOrder(req.user?.userId as string, req.body);

    res.status(200).json(result);
  });

  getOrderById = catchAsync(async (req, res) => {
    const result = await OrderService.getOrderById(req.params.orderId as string);

    res.status(200).json(result);
  });

  getUserOrders = catchAsync(async (req, res) => {
    const result = await OrderService.getUserOrders(req.params.userId as string);

    res.status(200).json(result);
  });

  updateOrderStatus = catchAsync(async (req, res) => {
    const result = await OrderService.updateOrderStatus(req.params.orderId as string, req.body.status as string);

    res.status(200).json(result);
  });
}

export default new OrderController();
