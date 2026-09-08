import type { RouteParams } from "./types/index.ts";
import DeliveryService from "./delivery.service.ts";
import catchAsync from "./utils/index.ts";
import {
  courierLoginSchema,
  courierPerformanceSchema,
  courierRegisterSchema,
  courierStatusUpdateSchema,
  deliveryStatusUpdateSchema,
  validateDto,
} from "./delivery.dto.ts";
import deliveryService from "./delivery.service.ts";

class DeliveryController {
  register = catchAsync(async (req, res) => {
    const registerData = await validateDto(courierRegisterSchema, req.body);

    const result = await deliveryService.register(registerData);

    res.status(201).json(result);
  });

  login = catchAsync(async (req, res) => {
    const loginData = await validateDto(courierLoginSchema, req.body);

    const result = await deliveryService.login(loginData);

    res.status(200).json(result);
  });

  updateCourierStatus = catchAsync(async (req, res) => {
    const statusData = await validateDto(courierStatusUpdateSchema, req.body);
    const courierId = req.user?.userId as string;

    const result = await deliveryService.updateCourierStatus(courierId, statusData);

    res.status(200).json(result);
  });

  getCourierPerformance = catchAsync(async (req, res) => {
    const { courierId } = req.params as { courierId: string };

    const result = await deliveryService.getCourierPerformance(courierId);

    res.status(200).json(result);
  });

  getAvailableOrders = catchAsync(async (req, res) => {
    const { courierId } = req.params as { courierId: string };

    const result = await deliveryService.getAvailableOrders(courierId);

    res.status(200).json(result);
  });

  acceptDelivery = catchAsync(async (req, res) => {
    const { orderId } = req.params as { orderId: string };

    const courierId = req.user?.userId as string;

    const result = await deliveryService.acceptDelivery(orderId, courierId);

    res.status(200).json(result);
  });

  updateDeliveryStatus = catchAsync(async (req, res) => {
    const deliveryData = await validateDto(deliveryStatusUpdateSchema, req.body);

    const { orderId } = req.params as { orderId: string };

    const courierId = req.user?.userId as string;

    const result = await deliveryService.updateDeliveryStatus(orderId, courierId, deliveryData);

    res.status(200).json(result);
  });

  trackDelivery = catchAsync(async (req, res) => {
    const { orderId } = req.params as { orderId: string };

    const result = await deliveryService.trackDelivery(orderId);

    res.status(200).json(result);
  });
}

export default new DeliveryController();
