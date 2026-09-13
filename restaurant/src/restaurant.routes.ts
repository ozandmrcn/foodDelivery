// ============================================================================
// 📌 RESTAURANT SERVICE — ROUTE DEFINITIONS (restaurant.routes.ts)
// ============================================================================
// Access matrix:
//   GET  /            -> any logged-in user (browse restaurants)
//   POST /            -> admin + restaurant_owner (open a new restaurant)
//   GET  /:id         -> any logged-in user (restaurant detail)
//   GET  /:id/menu    -> any logged-in user (browse the menu)
//   POST /:id/menu    -> admin + restaurant_owner (add a menu item)
//
// NOTE: ALL routes require authentication here (even browsing). This is a
// design choice for the learning project — in a real app you'd usually allow
// anonymous browsing of restaurants/menus and protect only the WRITE routes.
// ============================================================================

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
