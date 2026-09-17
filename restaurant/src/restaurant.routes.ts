/* @file restaurant.routes.ts — Route table of the Restaurant service.
 * Access matrix:
 *   GET  /          -> any logged-in user (browse restaurants)
 *   POST /          -> admin + restaurant_owner (open a new restaurant)
 *   GET  /:id       -> any logged-in user (restaurant detail)
 *   GET  /:id/menu  -> any logged-in user (browse the menu)
 *   POST /:id/menu  -> admin + restaurant_owner (add a menu item)
 *
 * @note ALL routes require authentication — even browsing. That is a deliberate
 *   design choice here; a real app would usually keep reads public and protect
 *   only the WRITE routes.
 */

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