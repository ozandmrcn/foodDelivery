import * as z from "zod";

/**
 * ============================================================================
 * 📌 ZOD & DTO (Data Transfer Object) GUIDE
 * ============================================================================
 *
 * 1. What is Zod and Why Do We Use It?
 * ------------------------------------
 * - TypeScript ONLY performs compile-time static type checking. Once transpiled
 *   to JavaScript and running in production, all TypeScript types disappear.
 * - Request payloads (req.body, req.query, req.params) are untrusted runtime data
 *   that may be incomplete, invalid, or malicious.
 * - Zod provides runtime schema validation, catches errors early, and generates
 *   clean error messages while automatically deriving TypeScript types.
 *
 * 2. What is a DTO (Data Transfer Object)?
 * ----------------------------------------
 * - An object schema defining the shape and constraints of data sent between
 *   client and server (e.g., login credentials, registration details, addresses).
 *
 * 3. Type Inference (`z.infer`):
 * ------------------------------
 * - Instead of manually creating both a TypeScript `interface` and a Zod schema
 *   (which causes code duplication and maintenance burden), `z.infer<typeof schema>`
 *   extracts the static TypeScript type directly from the Zod schema.
 *
 * 4. What is `<T>` (TypeScript Generics)?
 * ---------------------------------------
 * - `<T>` is a "Type Variable" (a placeholder/generic parameter for any data type).
 * - Why do we use `validateDto<T>`?
 *   - When you pass `registerSchema` -> `T` becomes `RegisterInput`, return type is `Promise<RegisterInput>`.
 *   - When you pass `loginSchema`    -> `T` becomes `LoginInput`, return type is `Promise<LoginInput>`.
 *   - When you pass `addressSchema`  -> `T` becomes `AddressInput`, return type is `Promise<AddressInput>`.
 *   - Benefit: One single reusable function validates ANY schema and provides 100%
 *     type safety & IDE autocomplete without needing `any` or duplicate functions.
 */

// ============================================================================
// 📝 Zod Schemas (Validation Rules)
// ============================================================================

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

// ============================================================================
// 🏷️ Inferred TypeScript Types (DTO Interfaces)
// ============================================================================
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

// ============================================================================
// 🛠️ Generic DTO Validation Helper Function
// ============================================================================
/**
 * Generic Validation Helper
 * -------------------------
 * @param schema - The Zod schema to validate against (type: z.ZodSchema<T>)
 * @param data   - The raw untrusted input to validate (e.g. req.body)
 * @returns      - A Promise resolving to the validated, typed data of type <T>
 *
 * 💡 Usage in Controllers:
 * ------------------------
 * const validated = await validateDto(registerSchema, req.body); // 'validated' is typed as RegisterInput
 * const loginData = await validateDto(loginSchema, req.body);    // 'loginData' is typed as LoginInput
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
