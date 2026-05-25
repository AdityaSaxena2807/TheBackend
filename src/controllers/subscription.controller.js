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
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(400,"Channel not found");
  }
  const alreadySubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user?._id,
  });
  if (alreadySubscribed) {
    await Subscription.findByIdAndDelete(alreadySubscribed?._id);
    return res
      .status(200)
      .json(new ApiResponse(200, "Unsubscribed Successfully"));
  }
  await Subscription.create({
    channel: channelId,
    subscriber: req.user?._id,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, Subscription, "Subscribed Successfully"));
});

//!GET USER CHANNEL SUBSCRIBERS
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // TODO:controller to return subscriber list of a channel
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400,"Invalid channelId");
  }
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(400,"Channel not found");
  }
  const subscribersList = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
      },
    },
    {
      $project: {
        _id: 0,
        subscribersCount: 1,
        subscribers: {
          _id: 1,
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Subscribers List fetched successfully",
        subscribersList[0]
      )
    );
});

//!GET SUBSCRIBED CHANNELS
const getSubscribedChannels = asyncHandler(async (req, res) => {
  // TODO: controller to return channel list to which user has subscribed
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400,"Invalid subscriberId");
  }
  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(400,"Subscriber not found");
  }
  const channelsList = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
      },
    },
    {
      $addFields: {
        channelsCount: { $size: "$channels" },
      },
    },
    {
      $project: {
        _id: 0,
        channelsCount: 1,
        channels: {
          _id: 1,
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Channels List fetched successfully",
        channelsList[0] || { channels: [], channelsCount: 0 }
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
