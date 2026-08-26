import { model, Schema } from "mongoose";
import type { IAddress, IUser } from "./types/index.ts";
import bcrypt from "bcrypt";

const addressSchema = new Schema<IAddress>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: Number,
      required: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },

  { _id: true }, // important for id reference in user model
);

//User Schema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
    },

    password: {
      type: String,
    },

    firstName: {
      type: String,
    },

    lastName: {
      type: String,
    },

    phone: {
      type: String,
    },

    role: {
      type: String,
    },

    addresses: [addressSchema],

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },

  //Timestamp and toJSON
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
      },
    },
  },
);

// Password Hashing Middleware
userSchema.pre("save", async function () {
  // if password not modified, do not hash
  if (!this.isModified("password")) return;

  // hash password
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log(error);
  }
});

// Password Comparison Method
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });

const User = model("User", userSchema);
export default User;
