/* @file restaurant.model.ts — Mongoose models of the Restaurant service.
 * Two collections: Restaurant (the place) and MenuItem (food it sells).
 *
 * Relationship lesson:
 * MenuItem.restaurantId has `{ ref: "Restaurant" }` — that ref enables
 * populate() JOINs WITHIN this service's OWN database. Contrast with the order
 * service, where userId/restaurantId have NO ref because the targets live in
 * ANOTHER service's database and cannot be joined. Microservice boundary:
 * you can only populate inside your own database.
 *
 * @embed openingHours: a weekday->string map embedded so reading a restaurant
 * includes its hours in one query.
 */

import { model, Schema } from "mongoose";
import type { IRestaurant, IMenuItem, IOpeningHours } from "./types/index.ts";

// @embed openingHoursSchema — one string per day ("09:00-22:00"). Embedded
// because it is always needed with the restaurant and never reused elsewhere.
const openingHoursSchema = new Schema<IOpeningHours>({
  monday: { type: String, required: true },
  tuesday: { type: String, required: true },
  wednesday: { type: String, required: true },
  thursday: { type: String, required: true },
  friday: { type: String, required: true },
  saturday: { type: String, required: true },
  sunday: { type: String, required: true },
});

// @schema restaurantSchema
const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    // @field categories — string array of tags ("pizza", "fast_food", ...);
    //   the service filter matches restaurants whose categories contain the value.
    categories: { type: [String], required: true, default: [] },
    deliveryTime: { type: Number, required: true }, // minutes
    minOrder: { type: Number, required: true }, // minimum basket amount
    deliveryFee: { type: Number, required: true },
    rating: { type: Number, default: 0 }, // @note 0..5, updated elsewhere, not here
    isActive: { type: Boolean, required: true, default: true }, // accepting orders?
    isOpen: { type: Boolean, required: true, default: true }, // current open flag
    openingHours: { type: openingHoursSchema, required: true },
    ownerId: { type: String, required: true }, // @value-ref to the auth service user
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

// @schema menuItemSchema — one food item offered by a restaurant
const menuItemSchema = new Schema<IMenuItem>(
  {
    // @ref "Restaurant" — allows populate() within THIS service's database.
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    imageUrl: { type: String, default: null },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] }, // e.g. ["gluten", "milk"]
    isVegetarian: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true }, // @field sold out flag
    preparationTime: { type: Number, required: true, min: 0 }, // minutes
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

const MenuItem = model("MenuItem", menuItemSchema);

const Restaurant = model("Restaurant", restaurantSchema);

export { Restaurant, MenuItem };