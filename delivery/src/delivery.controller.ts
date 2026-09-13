// ============================================================================
// 📌 DELIVERY SERVICE — CONTROLLER LAYER (delivery.controller.ts)
// ============================================================================
// HTTP interface layer: validate request input -> call service -> JSON response.
//
// Note the pattern used to identify "who is acting":
//   - courier-specific actions (status, accept, update status) use
//     `req.user?.userId` — set from the JWT by the authenticate middleware.
//   - admin views (performance) pass the courierId from req.params.
//
// `catchAsync` wraps every handler so thrown errors reach the app.ts error
// middleware instead of crashing the process.
// ============================================================================

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
  // POST /couriers/register (public — no token needed)
  register = catchAsync(async (req, res) => {
    const registerData = await validateDto(courierRegisterSchema, req.body);

    const result = await deliveryService.register(registerData);

    res.status(201).json(result);
  });

  // POST /couriers/login (public)
  login = catchAsync(async (req, res) => {
    const loginData = await validateDto(courierLoginSchema, req.body);

    const result = await deliveryService.login(loginData);

    res.status(200).json(result);
  });

  // PATCH /couriers/status (protected: courier role only)
  updateCourierStatus = catchAsync(async (req, res) => {
    const statusData = await validateDto(courierStatusUpdateSchema, req.body);
    // The COURIER updates THEIR OWN status — id comes from the token, not body.
    const courierId = req.user?.userId as string;

    const result = await deliveryService.updateCourierStatus(courierId, statusData);

    res.status(200).json(result);
  });

  // GET /couriers/:courierId/performance (protected: admin role only)
  getCourierPerformance = catchAsync(async (req, res) => {
    // For an admin, the target courier comes from the URL path.
    const { courierId } = req.params as { courierId: string };

    const result = await deliveryService.getCourierPerformance(courierId);

    res.status(200).json(result);
  });

  // GET /orders (protected: courier role only) -> which orders are up for grabs
  getAvailableOrders = catchAsync(async (req, res) => {
    const { courierId } = req.params as { courierId: string };

    const result = await deliveryService.getAvailableOrders(courierId);

    res.status(200).json(result);
  });

  // POST /orders/:orderId/accept (protected: courier role only)
  acceptDelivery = catchAsync(async (req, res) => {
    const { orderId } = req.params as { orderId: string };

    // The claiming courier is whoever is authenticated — cannot be forged.
    const courierId = req.user?.userId as string;

    const result = await deliveryService.acceptDelivery(orderId, courierId);

    res.status(200).json(result);
  });

  // PATCH /orders/:orderId/status (protected: courier role only)
  updateDeliveryStatus = catchAsync(async (req, res) => {
    const deliveryData = await validateDto(deliveryStatusUpdateSchema, req.body);

    const { orderId } = req.params as { orderId: string };

    const courierId = req.user?.userId as string;

    const result = await deliveryService.updateDeliveryStatus(orderId, courierId, deliveryData);

    res.status(200).json(result);
  });

  // GET /orders/:orderId/tracking (protected: any logged-in user) -> for CUSTOMERS
  trackDelivery = catchAsync(async (req, res) => {
    const { orderId } = req.params as { orderId: string };

    const result = await deliveryService.trackDelivery(orderId);

    res.status(200).json(result);
  });
}

export default new DeliveryController();
