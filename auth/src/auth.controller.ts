/* @file auth.controller.ts — HTTP interface layer of the Auth service.
 * Controllers only: validate input -> call the service -> send the response.
 * @see auth.dto.ts for the Zod schemas, auth.service.ts for business logic.
 */

import { addressSchema, loginSchema, registerSchema, validateDto } from "./auth.dto.ts";
import authService from "./auth.service.ts";
import catchAsync from "./utils/index.ts";

class AuthController {
  // @route POST /register — public
  /** Register a new user and set both tokens as httpOnly cookies. */
  register = catchAsync(async (req, res, next) => {
    // Validate the raw body against the register Zod schema.
    const body = await validateDto(registerSchema, req.body);

    const result = await authService.register(body);

    // Set BOTH tokens as httpOnly cookies (invisible to browser JS — XSS-safe).
    res.cookie("refreshToken", result.data.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie("accessToken", result.data.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(201).json({ status: "success", message: "User registered successfully", result });
  });

  // @route POST /login — public
  /** Login and refresh the token cookies. */
  login = catchAsync(async (req, res, next) => {
    const body = await validateDto(loginSchema, req.body);

    const result = await authService.login(body);

    // Same cookie strategy as register — access short-lived, refresh long-lived.
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

  // @route POST /refresh — public
  /** Exchange the httpOnly refresh cookie for a fresh access token. */
  refreshToken = catchAsync(async (req, res, next) => {
    // The refresh token lives in an httpOnly cookie, not in the body.
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ status: "error", message: "Refresh token not found" });
    }

    const result = await authService.refresh(refreshToken);

    // Replace the old access-token cookie with the new one.
    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({ status: "success", message: "Token refreshed successfully", result });
  });

  // @route POST /logout — public
  /** Invalidate the session client-side by clearing both cookies. */
  logout = catchAsync(async (req, res, next) => {
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    res.status(200).json({ status: "success", message: "User logged out successfully" });
  });

  // @route POST /add-address — protected (authenticate)
  /** Append a new address to the authenticated user's addresses. */
  addAddress = catchAsync(async (req, res, next) => {
    const body = await validateDto(addressSchema, req.body);

    // @note req.user is set by the `authenticate` middleware in routes.ts.
    if (!req.user) {
      return next(new Error("User not found"));
    }

    const result = await authService.addAddress(req?.user?._id as string, body);

    res.status(200).json({ status: "success", message: "Address added successfully", result });
  });

  // @route GET /profile — protected (authenticate)
  /** Return the authenticated user. Password is stripped by the model's toJSON transform. */
  getProfile = catchAsync(async (req, res, next) => {
    res.status(200).json({ status: "success", message: "Profile fetched successfully", user: req.user });
  });
}

export default new AuthController();