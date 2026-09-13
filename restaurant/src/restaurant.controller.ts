// ============================================================================
// 📌 RESTAURANT SERVICE — CONTROLLER LAYER (restaurant.controller.ts)
// ============================================================================
// Standard HTTP layer: validate input -> delegate to service -> JSON response.
// Interesting detail: `next` is declared in each handler but never used here
// because `catchAsync` handles errors; Express ignores the extra parameter.
// ============================================================================

import type { RouteParams } from "./types/index.ts";
import RestaurantService from "./restaurant.service.ts";
import catchAsync from "./utils/index.ts";
import { validateDto, menuItemSchema, restaurantSchema, queryParamsSchema } from "./restaurant.dto.ts";

class RestaurantController {
  // GET / -> list all (filters + pagination via query params)
  getAllRestaurants = catchAsync(async (req, res, next) => {
    // req.query is a flat object of strings — the schema coerces them
    // into numbers with z.coerce (e.g. "rating=4" -> 4).
    const validatedQuery = await validateDto(queryParamsSchema, req.query);

    const result = await RestaurantService.getAll(validatedQuery);

    res.status(200).json(result);
  });

  // GET /:id -> single restaurant
  getRestaurant = catchAsync(async (req, res, next) => {
    const result = await RestaurantService.getById(req.params.id as string);

    res.status(200).json(result);
  });

  // GET /:id/menu -> menu items, optionally ?category=...
  getRestaurantMenu = catchAsync(async (req, res, next) => {
    const category = req.query.category as string | undefined;

    const result = await RestaurantService.getMenu(req.params.id as string, category);

    res.status(200).json(result);
  });

  // POST /:id/menu -> add menu item (role-protected, see routes)
  addMenuItem = catchAsync(async (req, res, next) => {
    const restaurantId = req.params.id as string;
    const validatedData = await validateDto(menuItemSchema, req.body);

    const result = await RestaurantService.addMenuItem(validatedData, restaurantId);

    res.status(201).json(result);
  });

  // POST / -> create restaurant (role-protected: admin / restaurant_owner)
  createRestaurant = catchAsync(async (req, res, next) => {
    // ownerId comes from the DECODED JWT on req.user (set by authenticate),
    // never from the request body.
    const ownerId = (req.user?.userId as string) || "";

    const validatedData = await validateDto(restaurantSchema, req.body);

    const result = await RestaurantService.create(validatedData, ownerId);

    res.status(201).json(result);
  });
}

export default new RestaurantController();
