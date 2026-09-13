// ============================================================================
// 📌 AUTH SERVICE — BUSINESS LOGIC LAYER (auth.service.ts)
// ============================================================================
// WHAT DOES THE SERVICE DO?
// -------------------------
// This is the "brain" of the auth service: all business rules live here.
// The controller calls service methods like:
//   authService.register(body)  -> { status, data: { user, tokens } }
//   authService.login(body)     -> { status, data: { user, tokens } }
//   authService.refresh(token)  -> { accessToken }
//
// WHAT IS JWT (JSON Web Token)?
// -----------------------------
// A JWT is a signed string of the form: `header.payload.signature`.
//   - `header`: algorithm used (e.g. HS256)
//   - `payload`: the data you put inside (here: { userId, role })
//   - `signature`: proves the token was signed with YOUR secret key
//
// Why JWTs for auth? They are STATELESS: the server does not store sessions.
// Any server that knows the JWT_SECRET can verify the token without a DB call.
//
// ACCESS vs REFRESH TOKENS:
// -------------------------
// - Access token:  short-lived (1 hour). Sent on every API request. If stolen,
//   the damage window is at most 1 hour.
// - Refresh token: long-lived (7 days). Used ONLY to request a new access token.
//   This way you don't ask users to log in every hour.
//
// NOTE: This service is a SINGLETON (exported as `new AuthService()`).
//   - No reason to create new instances — it holds no per-request state.
//   - All state lives in the DB or is passed as function parameters.
// ============================================================================

import type { AddressInput, LoginInput, RegisterInput } from "./auth.dto.ts";
import User from "./auth.model.ts";
import type { IAddress, IAuthResponse, IJwtPayload, IUser } from "./types/index.ts";
import jwt from "jsonwebtoken";

class AuthService {
  constructor() {}

  // -------------------------------------------------------
  // PRIVATE: generateTokens()
  // -------------------------------------------------------
  // Creates both an access token and a refresh token for a given user.
  // `jwt.sign(payload, secret, options)` returns a signed JWT string.
  private generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign({ userId: user?._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign({ userId: user?._id, role: user.role }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  // -------------------------------------------------------
  // PUBLIC: register()
  // -------------------------------------------------------
  async register(userData: RegisterInput): Promise<IAuthResponse> {
    // 1. Check for duplicate email.
    const email = await User.findOne({ email: userData.email });

    if (email) {
      throw new Error("This email is already registered");
    }

    // 2. Create the user. The `pre("save")` hook in the model automatically
    //    hashes the password before writing to the DB.
    const user = new User(userData);
    await user.save();

    // 3. Generate tokens and return the public user data (no password leaks).
    const tokens = this.generateTokens(user);

    // Datas that will be sent to client
    return {
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // -------------------------------------------------------
  // PUBLIC: login()
  // -------------------------------------------------------
  // Always returns the SAME error message for email OR password failures
  // to prevent attackers from figuring out which emails are registered.
  async login(loginData: LoginInput): Promise<IAuthResponse> {
    const user = await User.findOne({ email: loginData.email });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // comparePassword is defined in auth.model.ts on userSchema.methods.
    // It re-hashes the raw password and compares it to the stored hash.
    const isPasswordValid = await user.comparePassword(loginData.password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const tokens = this.generateTokens(user);

    // Datas that will be sent to client
    return {
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // -------------------------------------------------------
  // PUBLIC: refresh()
  // -------------------------------------------------------
  // Verifies the REFRESH token (not the access token) and issues a new access token.
  // This is how the client stays logged in without re-entering credentials.
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded = (await jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)) as IJwtPayload;

    // Make sure the user still exists (could have been deleted).
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error("Invalid token");
    }

    // NOTE: we only generate a new ACCESS token, not a new refresh token.
    // In production you would rotate the refresh token for extra security.
    const tokens = this.generateTokens(user);

    return { accessToken: tokens.accessToken };
  }

  // -------------------------------------------------------
  // PUBLIC: addAddress()
  // -------------------------------------------------------
  async addAddress(
    userId: string,
    addressData: AddressInput,
  ): Promise<{ status: string; data: { addresses: IAddress[] | undefined } }> {
    const user = await User.findById(userId);

    // If the new address is marked as default, unset default on all others first.
    // This ensures at most one address has isDefault: true.
    if (addressData.isDefault) {
      user?.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    if (!user) {
      throw new Error("User not found");
    }

    // push() adds the new address to the embedded subdocument array.
    user?.addresses.push(addressData);
    await user?.save();

    return {
      status: "success",
      data: {
        addresses: user?.addresses,
      },
    };
  }
}

// Singleton export: one instance shared across all controllers that import it.
export default new AuthService();
