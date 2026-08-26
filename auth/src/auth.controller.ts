import { addressSchema, loginSchema, registerSchema, validateDto } from "./auth.dto.ts";
import authService from "./auth.service.ts";
import catchAsync from "./utils/index.ts";

class AuthController {
  register = catchAsync(async (req, res, next) => {
    const body = await validateDto(registerSchema, req.body);

    const result = await authService.register(body);

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

  login = catchAsync(async (req, res, next) => {
    const body = await validateDto(loginSchema, req.body);

    const result = await authService.login(body);

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
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ status: "error", message: "Refresh token not found" });
    }

    const result = await authService.refresh(refreshToken);

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({ status: "success", message: "Token refreshed successfully", result });
  });

  logout = catchAsync(async (req, res, next) => {
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    res.status(200).json({ status: "success", message: "User logged out successfully" });
  });

  addAddress = catchAsync(async (req, res, next) => {
    const body = await validateDto(addressSchema, req.body);

    if (!req.user) {
      return next(new Error("User not found"));
    }

    const result = await authService.addAddress(req?.user?._id as string, body);

    res.status(200).json({ status: "success", message: "Address added successfully", result });
  });

  getProfile = catchAsync(async (req, res, next) => {
    res.status(200).json({ status: "success", message: "Profile fetched successfully", user: req.user });
  });
}

export default new AuthController();
