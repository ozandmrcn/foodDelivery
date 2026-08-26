import express from "express";
import restaurantController from "./restaurant.controller.ts";
import { authenticate, authorize } from "./restaurant.middleware.ts";

const router = express.Router();

router.get("/", authenticate, restaurantController.getAllRestaurants);
router.post("/", authenticate, authorize(["admin", "restaurant_owner"]), restaurantController.createRestaurant);
router.get("/:id", authenticate, restaurantController.getRestaurant);
router.get("/:id/menu", authenticate, restaurantController.getRestaurantMenu);
router.post("/:id/menu", authenticate, authorize(["admin", "restaurant_owner"]), restaurantController.addMenuItem);

export default router;
