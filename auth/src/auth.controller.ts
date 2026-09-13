// ============================================================================
// 📌 AUTH SERVICE — CONTROLLER LAYER (auth.controller.ts)
// ============================================================================
// WHAT DOES A CONTROLLER DO?
// --------------------------
// The controller is the HTTP interface layer. It does 3 things and no more:
//   1. Validates request input (req.body, req.params, req.cookies)
//   2. Calls the corresponding service method for the business logic
//   3. Sends back the HTTP response (status code + JSON)
//
// WHY NOT put business logic here?
// ---------------------------------
// Because services are NOT HTTP-aware. If you want to call the same logic
// from a CLI script or a RabbitMQ consumer later, you can import the service
// without spinning up Express. This is a big advantage of microservices.
//
// `catchAsync` wrapper:
// ---------------------
// Every route handler here is wrapped in `catchAsync(...)`. It catches any
// Promise rejection (i.e. thrown errors from `await ...`) and forwards them
// to Express's error handler (app.use((err, ...) in app.ts). Without this
// wrapper, an unhandled async error would crash the server silently.
//
// REFRESH TOKEN FLOW (in detail):
// --------------------------------
// Client sends POST /refresh with the httpOnly cookie `refreshToken`.
// 1. Controller reads the cookie from req.cookies.
// 2. Calls authService.refresh(token) which verifies the refresh secret.
// 3. A new ACCESS token (short-lived, 1h) is set in an httpOnly cookie and
//    returned. The old refresh token is NOT rotated in this implementation
//    (the old refresh token stays valid until it expires — see auth.service.ts).
//
// COOKIE SECURITY (httpOnly):
// ---------------------------
// httpOnly = true  -> JavaScript in the browser CANNOT read the cookie
// secure = (not set) -> would need `secure: true` for HTTPS in production
// This prevents XSS attacks from stealing tokens.
// ============================================================================

import { addressSchema, loginSchema, registerSchema, validateDto } from "./auth.dto.ts";
import authService from "./auth.service.ts";
import catchAsync from "./utils/index.ts";

class AuthController {
  register = catchAsync(async (req, res, next) => {
    // 1. Validate request body against the register Zod schema.
    //    Throws a descriptive error if the input is invalid.
    const body = await validateDto(registerSchema, req.body);

    // 2. Service returns { status, data: { user, accessToken, refreshToken } }
    const result = await authService.register(body);

    // 3. Set BOTH tokens as httpOnly cookies (not visible to browser JS).
    res.cookie("refreshToken", result.data.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("accessToken", result.data.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // 4. 201 = "Created", along with a success message.
    res.status(201).json({ status: "success", message: "User registered successfully", result });
  });

  login = catchAsync(async (req, res, next) => {
    const body = await validateDto(loginSchema, req.body);

    const result = await authService.login(body);

    // Same cookie logic as register — access token short-lived, refresh long.
    res.cookie("refreshToken", result.data.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("accessToken", result.data.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({ status: "success", message: "User logged in successfully", result });
  });

  refreshToken = catchAsync(async (req, res, next) => {
    // The refresh token is stored in an httpOnly cookie, NOT the body.
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ status: "error", message: "Refresh token not found" });
    }

    // Verify and generate a new access token only (not a new refresh token).
    const result = await authService.refresh(refreshToken);

    // Replace the old access token cookie with the new one.
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({ status: "success", message: "Token refreshed successfully", result });
  });

  logout = catchAsync(async (req, res, next) => {
    // Clear both cookies on the client — the session is now dead.
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    res.status(200).json({ status: "success", message: "User logged out successfully" });
  });

  addAddress = catchAsync(async (req, res, next) => {
    const body = await validateDto(addressSchema, req.body);

    // req.user was set by the `authenticate` middleware in routes.ts.
    if (!req.user) {
      return next(new Error("User not found"));
    }

    const result = await authService.addAddress(req?.user?._id as string, body);

    res.status(200).json({ status: "success", message: "Address added successfully", result });
  });

  // This route is protected by `authenticate` — req.user holds the full
  // user document (without password, thanks to the toJSON transform in model).
  getProfile = catchAsync(async (req, res, next) => {
    res.status(200).json({ status: "success", message: "Profile fetched successfully", user: req.user });
  });
}

export default new AuthController();
