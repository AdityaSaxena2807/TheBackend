import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//!TOGGLE SUBSCRIPTION
const toggleSubscription = asyncHandler(async (req, res) => {
  // TODO: toggle subscription
  const { channelId } = req.params;
});

//!GET USER CHANNEL SUBSCRIBERS
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // TODO:controller to return subscriber list of a channel
  const { channelId } = req.params;
});

//!GET SUBSCRIBED CHANNELS
const getSubscribedChannels = asyncHandler(async (req, res) => {
  // TODO: controller to return channel list to which user has subscribed
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
