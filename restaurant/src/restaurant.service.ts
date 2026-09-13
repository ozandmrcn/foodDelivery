// ============================================================================
// 📌 RESTAURANT SERVICE — BUSINESS LOGIC LAYER (restaurant.service.ts)
// ============================================================================
// Pure CRUD for restaurants + menu items. No RabbitMQ (see app.ts header for
// the "not every service needs a bus" reasoning).
//
// PATTERNS WORTH REMEMBERING:
// ---------------------------
// 1. PAGINATION: page/limit -> skip = (page - 1) * limit. Classic offset pagination.
// 2. DYNAMIC FILTER BUILDING: build a `filter` object conditionally, then run
//    ONE query with it. Nicer than writing 4 different if/else queries.
//    `$gte` / `$lte` are MongoDB comparison operators ("greater than or equal").
// 3. PROMISE.ALL: `find` and `countDocuments` run IN PARALLEL (both are
//    independent DB queries) instead of one after the other — latency halved.
// 4. SORT: `.sort({ rating: "desc" })` = best-rated restaurants first.
// ============================================================================

import type { MenuItemInput, QueryParamsInput, RestaurantInput } from "./restaurant.dto.ts";
import { MenuItem, Restaurant } from "./restaurant.model.ts";

class RestaurantService {
  constructor() {}

  // -------------------------------------------------------
  // LIST RESTAURANTS (with filters + pagination)
  // -------------------------------------------------------
  async getAll(query: QueryParamsInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit; // how many docs to jump over

    // Build the filter object piece by piece (only add filters that were sent).
    const filter: any = {};

    if (query.category) filter.categories = query.category; // exact category match
    if (query.rating !== undefined) filter.rating = { $gte: query.rating }; // rating >= X
    if (query.deliveryTime !== undefined) filter.deliveryTime = { $lte: query.deliveryTime }; // delivery <= X min
    if (query.minOrder !== undefined) filter.minOrder = { $lte: query.minOrder }; // min order <= X TL

    // Run the filtered find + the total count in PARALLEL (Promise.all).
    // `total` drives the pagination metadata in the response.
    const [items, total] = await Promise.all([
      Restaurant.find(filter).sort({ rating: "desc" }).skip(skip).limit(limit),
      Restaurant.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // Read a single restaurant by _id.
  async getById(id: string) {
    return await Restaurant.findById(id);
  }

  // Read the menu (menu items) of one restaurant, optionally filtered by category.
  async getMenu(restaurantId: string, category?: string) {
    const filter: { restaurantId: string; category?: string } = { restaurantId };

    if (category) filter.category = category;

    return await MenuItem.find(filter);
  }

  // Add one menu item to a restaurant (restaurantId injected, never trusted
  // from the client body).
  async addMenuItem(data: MenuItemInput, restaurantId: string) {
    const newItem = new MenuItem({ ...data, restaurantId });
    return await newItem.save();
  }

  // Create a new restaurant. ownerId comes from the JWT (req.user.userId),
  // NOT from the request body — so a user cannot create a restaurant as
  // someone else.
  async create(data: RestaurantInput, ownerId: string) {
    const newRestaurant = await Restaurant.create({ ...data, ownerId });

    return newRestaurant;
  }
}

export default new RestaurantService();
