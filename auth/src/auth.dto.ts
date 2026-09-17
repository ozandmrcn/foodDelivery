/* @file auth.dto.ts — Zod schemas + inferred types (DTOs) for the Auth service.
 * DTO = the agreed shape of data entering the service. Zod validates untrusted
 * runtime input AND derives the TypeScript types below (z.infer).
 */

import * as z from "zod";

/**
 * Zod & DTO (Data Transfer Object) quick guide
 * 1. TypeScript types vanish at runtime; Zod schemas do NOT — validation
 *    happens against real request payloads, not just at compile time.
 * 2. DTO = the contract for data crossing the API boundary (login, register,
 *    address). Keeping it in one schema avoids type/schema duplication.
 * 3. z.infer<typeof schema> extracts the static TS type from the schema, so
 *    there is exactly ONE source of truth for a shape.
 * 4. validateDto<T> is generic: pass any schema -> get that schema's inferred
 *    type back with IDE autocomplete (no `any`, no per-schema helpers).
 */

const registerSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstName: z.string().min(2, "First name must be at least 2 characters long"),
  lastName: z.string().min(2, "Last name must be at least 2 characters long"),
  phone: z.string().min(2, "Phone number must be at least 2 characters long"),
  role: z.enum(["customer", "restaurant_owner", "courier", "admin"]).default("customer"),
});

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const addressSchema = z.object({
  title: z.string().min(1, "Title is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  district: z.string().min(1, "District is required"),
  postalCode: z.number().min(1, "Postal code is required"),
  isDefault: z.boolean().default(false),
});

// @typedef Inferred DTO types — used across service/controller with full typing
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

/**
 * Validate untrusted data against any Zod schema.
 * @param schema - The Zod schema to validate against
 * @param data - Raw input, e.g. req.body
 * @returns The validated, typed data (type <T>)
 * @throws {Error} A single descriptive message on the first Zod error
 */
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

export { registerSchema, loginSchema, addressSchema, validateDto };