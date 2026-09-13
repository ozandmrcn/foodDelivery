// ============================================================================
// 📌 RESTAURANT SERVICE — MONGOOSE MODELS (restaurant.model.ts)
// ============================================================================
// Two collections: Restaurant (the place) and MenuItem (food it sells).
//
// IMPORTANT RELATIONSHIP LESSON:
// ------------------------------
// MenuItem.restaurantId is `{ type: Schema.Types.ObjectId, ref: "Restaurant" }`.
// The `ref` tells Mongoose *which collection* the id points to, enabling
// `MenuItem.populate("restaurantId")` to JOIN them on demand. Contrast with
// the order service, where userId/restaurantId have NO ref — because the target
// is in ANOTHER service's database and cannot be joined.
// That is exactly the boundary microservice architecture draws: you can only
// populate within your OWN database.
//
// EMBEDDED OPENING HOURS: a plain weekday->string map, embedded so reading a
// restaurant includes its hours without a second query.
// ============================================================================

import { model, Schema } from "mongoose";
import type { IRestaurant, IMenuItem, IOpeningHours } from "./types/index.ts";

// Opening Hours
// A small subdocument: one string per day ("09:00-22:00"). Embedded because
// it is always needed with the restaurant and never reused elsewhere.
const openingHoursSchema = new Schema<IOpeningHours>({
  monday: { type: String, required: true },
  tuesday: { type: String, required: true },
  wednesday: { type: String, required: true },
  thursday: { type: String, required: true },
  friday: { type: String, required: true },
  saturday: { type: String, required: true },
  sunday: { type: String, required: true },
});

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    // String array of tags ("pizza", "fast_food", ...) — the filter in the
    // service matches restaurants whose categories contain the query value.
    categories: { type: [String], required: true, default: [] },
    deliveryTime: { type: Number, required: true }, // minutes
    minOrder: { type: Number, required: true }, // minimum basket amount
    deliveryFee: { type: Number, required: true },
    rating: { type: Number, default: 0 }, // 0..5, updated elsewhere (not here)
    isActive: { type: Boolean, required: true, default: true }, // accepting orders?
    isOpen: { type: Boolean, required: true, default: true }, // current open flag
    openingHours: { type: openingHoursSchema, required: true },
    ownerId: { type: String, required: true }, // value ref to the auth service user
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

const menuItemSchema = new Schema<IMenuItem>(
  {
    // ref: "Restaurant" — allows populate() WITHIN this service's database.
    // This is the "local foreign key" of the restaurant service.
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    imageUrl: { type: String, default: null },
    ingredients: { type: [String], default: [] },
    allergens: { type: [String], default: [] }, // e.g. ["gluten", "milk"]
    isVegetarian: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true }, // sold out flag
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
