// ============================================================================
// 📌 AUTH SERVICE — DATA MODEL (auth.model.ts)
// ============================================================================
// WHAT IS A MONGOOSE MODEL?
// -------------------------
// Mongoose = an "ODM" (Object Document Mapper) for MongoDB. It lets us define
// a SCHEMA (shape + rules of the document) and a MODEL (the "collection handle"
// we use to run queries like User.findOne, User.create).
//
// This model answers 2 important security questions:
// 1. "How is the password hashed before it is saved?"  -> pre("save") hook
// 2. "How do we check a raw password at login?"        -> comparePassword()
//
// LAYER RULE in MVC/microservice file-structure:
//   controller (HTTP) -> service (business logic) -> model (data) -> DB
// The model is the only layer that talks directly to MongoDB.
// ============================================================================

import { model, Schema } from "mongoose";
import type { IAddress, IUser } from "./types/index.ts";
import bcrypt from "bcrypt";

// ----------------------------------------------------------------------------
// EMBEDDED (SUBDOCUMENT) SCHEMA — Address
// ----------------------------------------------------------------------------
// Instead of a separate `addresses` collection, each user's addresses are
// embedded INSIDE the user document (a mongoose "subdocument"). This is the
// MongoDB way of modeling a "has-many" relationship when the child always
// belongs to exactly one parent. Embedded = fast reads, no joins needed.
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

  { _id: true }, // important for id reference in user model
);

//User Schema
const userSchema = new Schema<IUser>(
  {
    // NOTE: validation rules are deliberately OMITTED here for most fields.
    // They are validated at the API layer with Zod (see auth.dto.ts) BEFORE
    // the data ever reaches the database. The schema only defines types.
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

    // Embedded documents: an array of address subdocuments (defined above).
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
    // timestamps: true -> Mongoose auto-adds createdAt & updatedAt fields.
    timestamps: true,
    // toJSON.transform: controls what shape a document takes when serialized
    // to JSON (e.g. res.json(user)). Here we RENAME `_id` -> `id` and DELETE
    // `_id`, `__v` AND THE PASSWORD — so the hashed password NEVER leaks
    // into an API response, even if someone accidentally returns the whole user.
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
// ----------------------------
// A `pre("save")` hook is a Mongoose MIDDLEWARE that runs automatically BEFORE
// a document is saved. This is where we hash the password.
// Why hash? bcrypt uses a one-way function: even if the DB leaks, the real
// password is NOT recoverable. salt rounds (12) make brute-forcing expensive.
userSchema.pre("save", async function () {
  // if password not modified, do not hash
  // `this.isModified("password")` is true only when the password field was
  // actually changed. This matters for UPDATE operations: we never want to
  // re-hash an already-hashed password just because some other field changed.
  if (!this.isModified("password")) return;

  // hash password
  try {
    // genSalt(12) creates a random "salt" with 12 rounds of difficulty,
    // then hash() combines salt + password into the final hashed string.
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.log(error);
  }
});

// Password Comparison Method
// --------------------------
// A custom mongoose METHOD attached to every User instance (user.comparePassword).
// At login the user submits a raw password; comparePassword() re-hashes that
// raw value with the stored salt and returns true if they match.
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
// --------------------------
// MongoDB indexes make queries on these fields fast. Without an index on
// `email`, every `User.findOne({ email })` does a full collection scan.
// Note: `unique` would also be smart here, but this schema only adds indexes.
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });

// `model("User", userSchema)` compiles the schema into a MODEL tied to the
// `users` collection. Import this model anywhere you need user queries.
const User = model("User", userSchema);
export default User;
