import type { AddressInput, LoginInput, RegisterInput } from "./auth.dto.ts";
import User from "./auth.model.ts";
import type { IAddress, IAuthResponse, IJwtPayload, IUser } from "./types/index.ts";
import jwt from "jsonwebtoken";

class AuthService {
  constructor() {}

  private generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign({ userId: user?._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign({ userId: user?._id, role: user.role }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  async register(userData: RegisterInput): Promise<IAuthResponse> {
    const email = await User.findOne({ email: userData.email });

    if (email) {
      throw new Error("This email is already registered");
    }

    const user = new User(userData);
    await user.save();

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

  async login(loginData: LoginInput): Promise<IAuthResponse> {
    const user = await User.findOne({ email: loginData.email });

    if (!user) {
      throw new Error("Invalid email or password");
    }

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

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded = (await jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)) as IJwtPayload;

    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error("Invalid token");
    }

    const tokens = this.generateTokens(user);

    return { accessToken: tokens.accessToken };
  }

  async addAddress(
    userId: string,
    addressData: AddressInput,
  ): Promise<{ status: string; data: { addresses: IAddress[] | undefined } }> {
    const user = await User.findById(userId);

    if (addressData.isDefault) {
      user?.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    if (!user) {
      throw new Error("User not found");
    }

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

export default new AuthService();
