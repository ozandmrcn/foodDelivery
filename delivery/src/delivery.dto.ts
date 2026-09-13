// ============================================================================
// 📌 DELIVERY SERVICE — DTO & VALIDATION (delivery.dto.ts)
// ============================================================================
// Zod schemas for every delivery/courier request body + inferred TS types.
// Highlights worth remembering:
//   - The `location` object is reused in several schemas -> consistent GPS shape.
//   - Coordinates get GEO range checks: latitude -90..90, longitude -180..180.
//   - `.enum([...])` restricts statuses to the same values the MongoDB ENUMs use
//     in delivery.model.ts — keep the two in sync!
// ============================================================================

import { z } from "zod";

// courier register
const courierRegisterSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  vehicleType: z.enum(["motorcycle", "bicycle", "car"]),
  vehiclePlate: z.string().optional(),
  isAvailable: z.boolean().default(true),
});

// courier login
const courierLoginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// courier status update
const courierStatusUpdateSchema = z.object({
  status: z.enum(["available", "busy", "offline"]),
  location: z
    .object({
      latitude: z.number().min(-90).max(90, "Please enter a valid latitude value"),
      longtitude: z.number().min(-180).max(180, "Please enter a valid longitude value"),
    })
    .optional(), // GPS point appended to the courier's location history
});

// delivery status update — the courier progress steps
const deliveryStatusUpdateSchema = z.object({
  status: z.enum(["assigned", "picked_up", "in_transit", "delivered", "failed"]),
  location: z
    .object({
      latitude: z.number().min(-90).max(90, "Please enter a valid latitude value"),
      longtitude: z.number().min(-180).max(180, "Please enter a valid longitude value"),
    })
    .optional(),
  estimatedArrival: z.number().min(1, "Estimated arrival time must be at least 1 minute").optional(),
  actualArrival: z.date().optional(), // set when the food is handed over
  notes: z.string().optional(),
});

// courier performance
const courierPerformanceSchema = z.object({
  deliveriesCompleted: z.number().min(0, "Completed deliveries count must be at least 0"),
  averageRating: z.number().min(0).max(5, "Average rating must be between 0 and 5"),
  totalEarnings: z.number().min(0, "Total earnings must be at least 0"),
  period: z.enum(["daily", "weekly", "monthly"]),
});

// location update
const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90, "Please enter a valid latitude value"),
  longtitude: z.number().min(-180).max(180, "Please enter a valid longitude value"),
  timestamp: z.date().optional(),
});

// export schemas
export {
  courierRegisterSchema,
  courierLoginSchema,
  courierStatusUpdateSchema,
  deliveryStatusUpdateSchema,
  courierPerformanceSchema,
  locationUpdateSchema,
};

// type inference — TS types auto-derived from the schemas (single source of truth)
export type CourierRegisterInput = z.infer<typeof courierRegisterSchema>;
export type CourierLoginInput = z.infer<typeof courierLoginSchema>;
export type CourierStatusUpdateInput = z.infer<typeof courierStatusUpdateSchema>;
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>;
export type CourierPerformanceInput = z.infer<typeof courierPerformanceSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

// Function to validate data against a schema
// Generic <T>: each schema passed here yields a differently-typed result.
export async function validateDto<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(z.prettifyError(error));
    }

    throw error;
  }
}
