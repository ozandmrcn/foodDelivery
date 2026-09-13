// ============================================================================
// 📌 ORDER SERVICE — DTO & VALIDATION (order.dto.ts)
// ============================================================================
// Purpose: define the exact SHAPE of incoming data (order, item, address,
// status, query params) and validate it at runtime with Zod.
// TypeScript types vanish at runtime — Zod schemas are the runtime guard that
// rejects malformed/malicious request bodies BEFORE they reach the database.
//
// The pattern in every schema: `z.object({ ... })` accepts only matching data;
// `.min(n)` enforces length; `.enum([...])` restricts to allowed strings;
// `.coerce.number()` coerces a query string like "5" into number 5.
// `z.infer<typeof schema>` derives a TypeScript type directly from the schema.
// ============================================================================

import { z } from "zod";

// address dto
const addressSchema = z.object({
  title: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  district: z.string().min(1, "District is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  isDefault: z.boolean().default(false),
});

// order item dto
// One basket line: product + name + price + quantity.
const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  price: z.number().min(1, "Price is required"),
  quantity: z.number().min(1, "Quantity is required"),
});

// order dto — the main order request body.
// NOTE: there is NO userId here. That comes from the JWT token, not the body.
// NOTE: there is NO totalAmount here. The server computes it (see service).
const orderSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  items: z.array(orderItemSchema).min(1, "At least one product must be selected"),
  deliveryAddress: addressSchema,
  paymentMethod: z.enum(["credit_card", "cash", "online"]),
  specialInstructions: z.string().optional(),
});

// status dto — but the enum here must match the one in order.model.ts!
const orderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"]),
  reason: z.string().optional(),
});

// query dto — if this DTO is ever used, it would guard list requests:
// pagination (page/limit), filter by status, date range.
const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// infer types — TypeScript types derived from the Zod schemas above.
// This is the "single source of truth" — change the schema, the type updates.
type AddressInput = z.infer<typeof addressSchema>;
type OrderItemInput = z.infer<typeof orderItemSchema>;
type OrderInput = z.infer<typeof orderSchema>;
type OrderStatusInput = z.infer<typeof orderStatusSchema>;
type QueryParamsInput = z.infer<typeof queryParamsSchema>;

// A function that takes a schema and data and checks whether the data is valid for the schema
// Generic <T>: pass orderSchema -> returns typed OrderInput; pass statusSchema ->
// returns OrderStatusInput. `schema.parse(data)` throws a ZodError on invalid data,
// which we convert into a readable Error message.
async function validateDto<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(z.prettifyError(error));
    }

    throw error;
  }
}

export { addressSchema, orderItemSchema, orderSchema, orderStatusSchema, queryParamsSchema, validateDto };
export type { AddressInput, OrderItemInput, OrderInput, OrderStatusInput, QueryParamsInput };
