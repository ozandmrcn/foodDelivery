import type { RouteParams } from "./types/index.ts";
import RestaurantService from "./restaurant.service.ts";
import catchAsync from "./utils/index.ts";
import { validateDto, menuItemSchema, restaurantSchema, queryParamsSchema } from "./restaurant.dto.ts";

class RestaurantController {
  getAllRestaurants = catchAsync(async (req, res, next) => {
    const validatedQuery = await validateDto(queryParamsSchema, req.query);

    const result = await RestaurantService.getAll(validatedQuery);

    res.status(200).json(result);
  });

  getRestaurant = catchAsync(async (req, res, next) => {
    const result = await RestaurantService.getById(req.params.id as string);

    res.status(200).json(result);
  });

  getRestaurantMenu = catchAsync(async (req, res, next) => {
    const category = req.query.category as string | undefined;

    const result = await RestaurantService.getMenu(req.params.id as string, category);

    res.status(200).json(result);
  });

  addMenuItem = catchAsync(async (req, res, next) => {
    const restaurantId = req.params.id as string;
    const validatedData = await validateDto(menuItemSchema, req.body);

    const result = await RestaurantService.addMenuItem(validatedData, restaurantId);

    res.status(201).json(result);
  });

  createRestaurant = catchAsync(async (req, res, next) => {
    const ownerId = (req.user?.userId as string) || "";

    const validatedData = await validateDto(restaurantSchema, req.body);

    const result = await RestaurantService.create(validatedData, ownerId);

    res.status(201).json(result);
  });
}

export default new RestaurantController();
