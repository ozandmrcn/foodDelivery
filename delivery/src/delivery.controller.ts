/* @file delivery.controller.ts — HTTP interface layer of the Delivery service.
 * Only: validate input -> call service -> send JSON. Identity comes from the
 * JWT payload (req.user?.userId) for courier actions; admin views pass the
 * courierId via the URL path.
 *
 * @see delivery.service.ts for business logic; errors are forwarded by catchAsync.
 */

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
  // @route POST /couriers/register — public
  /** Register a courier and set their access token as an httpOnly cookie. */
  register = catchAsync(async (req, res) => {
    const registerData = await validateDto(courierRegisterSchema, req.body);

    const result = await deliveryService.register(registerData);

    res.cookie("accessToken", result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.status(201).json(result);
  });

  // @route POST /couriers/login — public
  /** Login a courier and set their access token cookie. */
  login = catchAsync(async (req, res) => {
    const loginData = await validateDto(courierLoginSchema, req.body);

    const result = await deliveryService.login(loginData);

    res.cookie("accessToken", result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.status(200).json(result);
  });

  // @route PATCH /couriers/status — protected (courier only)
  /** Update the authenticated courier's availability. */
  updateCourierStatus = catchAsync(async (req, res) => {
    const statusData = await validateDto(courierStatusUpdateSchema, req.body);
    // ! The courier updates THEIR OWN status — id comes from the token, never body.
    const courierId = req.user?.userId as string;

    const result = await deliveryService.updateCourierStatus(courierId, statusData);

    res.status(200).json(result);
  });

  // @route GET /couriers/:courierId/performance — protected (admin only)
  /** Admin view: fetch a courier's delivery metrics. */
  getCourierPerformance = catchAsync(async (req, res) => {
    const { courierId } = req.params as { courierId: string };

    const result = await deliveryService.getCourierPerformance(courierId);

    res.status(200).json(result);
  });

  // @route GET /orders — protected (courier only)
  /** List deliveries still waiting for a courier. */
  getAvailableOrders = catchAsync(async (req, res) => {
    const result = await deliveryService.getAvailableOrders();

    res.status(200).json(result);
  });

  // @route POST /orders/:orderId/accept — protected (courier only)
  /** Claim a delivery for the authenticated courier. */
  acceptDelivery = catchAsync(async (req, res) => {
    const { orderId } = req.params as { orderId: string };

    // The claiming courier is whoever is authenticated — cannot be forged.
    const courierId = req.user?.userId as string;

    const result = await deliveryService.acceptDelivery(orderId, courierId);

    res.status(200).json(result);
  });

  // @route PATCH /orders/:orderId/status — protected (courier only)
  /** Advance the delivery progress (picked_up -> in_transit -> delivered). */
  updateDeliveryStatus = catchAsync(async (req, res) => {
    const deliveryData = await validateDto(deliveryStatusUpdateSchema, req.body);

    const { orderId } = req.params as { orderId: string };

    const courierId = req.user?.userId as string;

    const result = await deliveryService.updateDeliveryStatus(orderId, courierId, deliveryData);

    res.status(200).json(result);
  });

  // @route GET /orders/:orderId/tracking — protected (any logged-in user)
  /** Customer view: read-only live tracking of a delivery. */
  trackDelivery = catchAsync(async (req, res) => {
    const { orderId } = req.params as { orderId: string };

    const result = await deliveryService.trackDelivery(orderId);

    res.status(200).json(result);
  });
}

export default new DeliveryController();