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
const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  price: z.number().min(1, "Price is required"),
  quantity: z.number().min(1, "Quantity is required"),
});

// order dto
const orderSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  items: z.array(orderItemSchema).min(1, "At least one product must be selected"),
  deliveryAddress: addressSchema,
  paymentMethod: z.enum(["credit_card", "cash", "online"]),
  specialInstructions: z.string().optional(),
});

// status dto
const orderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"]),
  reason: z.string().optional(),
});

// query dto
const queryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// infer types
type AddressInput = z.infer<typeof addressSchema>;
type OrderItemInput = z.infer<typeof orderItemSchema>;
type OrderInput = z.infer<typeof orderSchema>;
type OrderStatusInput = z.infer<typeof orderStatusSchema>;
type QueryParamsInput = z.infer<typeof queryParamsSchema>;

// A function that takes a schema and data and checks whether the data is valid for the schema
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
