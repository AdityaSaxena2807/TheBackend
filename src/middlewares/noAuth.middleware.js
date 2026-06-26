import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

export const optionalAuth = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      next(); // no token, just continue as logged-out
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (user) {
      req.user = user; // attach if found
    }

    next(); // continue regardless
  } catch (error) {
    // token invalid/expired — don't block, just treat as logged-out
    next();
  }
});