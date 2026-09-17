/* @file auth.model.ts — Data layer of the Auth service.
 * Defines the User schema + an embedded Address subdocument, and answers two
 * security questions: how passwords are hashed on save, and how they are
 * compared at login.
 */

import { model, Schema } from "mongoose";
import type { IAddress, IUser } from "./types/index.ts";
import bcrypt from "bcrypt";

// * Embedded (Subdocument) Schema — Address
// -----------------------------------------
// @embed Addresses live INSIDE the user document (mongoose subdocument), not
// in a separate collection: right model for a child that always belongs to a
// single parent. Embedded = fast reads, no joins.
const addressSchema = new Schema<IAddress>(
  {
    title: {
      type: String,
      required: true,
      trim: true, // removes leading/trailing whitespace before saving
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

  { _id: true }, // @note id kept so addresses can be referenced uniquely
);

// @schema userSchema — one document = one registered user
const userSchema = new Schema<IUser>(
  {
    // @note Validation is deliberately OMITTED here: it happens at the API
    //   layer with Zod (auth.dto.ts) BEFORE data reaches MongoDB.
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

    // @embed addresses — array of address subdocuments defined above
    addresses: [addressSchema],

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },

  {
    // @field createdAt/updatedAt — auto-managed by timestamps: true
    timestamps: true,
    // @note toJSON.transform shapes every serialized user: renames _id -> id
    //   and DELETES password — the hash can never leak into an API response.
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

// * Password Hashing Middleware
// -----------------------------
// @hook pre("save") — runs automatically BEFORE every save.
// bcrypt hashes one-way (12 salt rounds): if the DB leaks, passwords stay safe.
userSchema.pre("save", async function () {
  // ! Guard: only re-hash when the password was actually changed — otherwise an
  //   unrelated update would re-hash an already-hashed password.
  if (!this.isModified("password")) return;

  // hash password
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log(error);
  }
});

// * Password Comparison Method
// ----------------------------
// @method comparePassword — available on every user instance. Re-hashes the
// raw candidate with the stored salt and returns whether it matches.
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// * Indexes
// ---------
// @note MongoDB indexes speed up common queries (a missing index = full scan).
// `unique` would also fit email, but this schema only adds plain indexes.
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });

// @model User — compiled model bound to the `users` collection.
const User = model("User", userSchema);
export default User;