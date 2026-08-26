import type { RouteParams } from "./types/index.ts";
import DeliveryService from "./delivery.service.ts";

class DeliveryController {
  register: RouteParams = async (req, res, next) => {
    try {
      res.status(201).json({ status: "success", message: "User registered successfully" });
    } catch (error) {
      next(error);
    }
  };

  login: RouteParams = async (req, res, next) => {
    try {
      res.status(200).json({ status: "success", message: "User logged in successfully" });
    } catch (error) {
      next(error);
    }
  };
}

export default new DeliveryController();
