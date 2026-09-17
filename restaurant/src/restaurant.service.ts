/* @file restaurant.service.ts — Business logic layer of the Restaurant service.
 * Pure CRUD for restaurants + menu items. No RabbitMQ (see app.ts header).
 *
 * Patterns worth remembering:
 * 1. PAGINATION: skip = (page - 1) * limit — classic offset pagination.
 * 2. DYNAMIC FILTER: build one `filter` object conditionally, then run a single
 *    query. $gte/$lte are MongoDB comparison operators.
 * 3. PROMISE.ALL: run independent DB queries (find + count) in PARALLEL.
 * 4. SORT: .sort({ rating: "desc" }) = best-rated restaurants first.
 */

import type { MenuItemInput, QueryParamsInput, RestaurantInput } from "./restaurant.dto.ts";
import { MenuItem, Restaurant } from "./restaurant.model.ts";

class RestaurantService {
  constructor() {}

  // * LIST RESTAURANTS (filters + pagination)
  /**
   * List restaurants with optional filters and pagination.
   * @param query - Validated query params (page, limit, category, rating, ...)
   * @returns { items, total, page, limit } — items + pagination metadata
   */
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

    // @note Promise.all runs find + count in PARALLEL (independent queries).
    const [items, total] = await Promise.all([
      Restaurant.find(filter).sort({ rating: "desc" }).skip(skip).limit(limit),
      Restaurant.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // * READ: single restaurant by _id
  async getById(id: string) {
    return await Restaurant.findById(id);
  }

  // * READ: the menu (menu items) of one restaurant, optionally by category
  async getMenu(restaurantId: string, category?: string) {
    const filter: { restaurantId: string; category?: string } = { restaurantId };

    if (category) filter.category = category;

    return await MenuItem.find(filter);
  }

  // * WRITE: add one menu item to a restaurant
  /**
   * @param data - Validated menu item input
   * @param restaurantId - Injected server-side, never trusted from the body
   */
  async addMenuItem(data: MenuItemInput, restaurantId: string) {
    const newItem = new MenuItem({ ...data, restaurantId });
    return await newItem.save();
  }

  // * WRITE: create a new restaurant
  /**
   * @param data - Validated restaurant input
   * @param ownerId - From the JWT (req.user.userId), never from the body —
   *   otherwise anyone could create a restaurant as someone else
   */
  async create(data: RestaurantInput, ownerId: string) {
    const newRestaurant = await Restaurant.create({ ...data, ownerId });

    return newRestaurant;
  }
}

// @singleton One shared instance for the whole service.
export default new RestaurantService();