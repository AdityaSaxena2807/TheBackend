import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//!CREATE TWEET
const createTweet = asyncHandler(async (req, res) => {
  // Extract and normalize content
  const content = req.body.content?.trim();

  if (!content) {
    throw new ApiError(400, "Tweet body is missing");
  }
  // Create tweet
  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  // Populate owner details
  const populatedTweet = await tweet.populate("owner", "username avatar");

  const responseTweet = {
    _id: populatedTweet._id,
    content: populatedTweet.content,
    owner: populatedTweet.owner._id,
    createdAt: populatedTweet.createdAt,
    ownerDetails: {
      _id: populatedTweet.owner._id,
      username: populatedTweet.owner.username,
      avatar: populatedTweet.owner.avatar,
    },
    likesCount: 0,
    isLiked: false,
  };

  return res
    .status(201)
    .json(new ApiResponse(201, "Tweet created successfully", responseTweet));
});

//!GET ALL TWEETS
const getAllTweets = asyncHandler(async (req, res) => {
  const tweets = await Tweet.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeDetails",
        pipeline: [
          {
            $project: {
              tweet: 1,
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likeDetails" },
        ownerDetails: { $first: "$ownerDetails" },
        isLiked: {
          $cond: {
            if: {
              $in: [
                req.user?._id
                  ? new mongoose.Types.ObjectId(req.user._id)
                  : null,
                "$likeDetails.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        owner: 1,
        "ownerDetails._id": 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweets fetched successfully", tweets));
});

//!GET USER TWEETS
const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "user not found");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeDetails",
        pipeline: [
          {
            $project: {
              tweet: 1,
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        ownerDetails: {
          $first: "$ownerDetails",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [
                req.user?._id
                  ? new mongoose.Types.ObjectId(req.user._id)
                  : null,
                "$likeDetails.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        "ownerDetails._id": 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
        avatar:1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweets fetched successfully", tweets));
});

//!UPDATE TWEET
const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { newContent } = req.body;
  const { tweetId } = req.params;
  if (!newContent) {
    throw new ApiError(400, "New body of tweet is missing");
  }
  // isValidObjectId is a method provided by mongoose to check if the given id is a valid ObjectId or not
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet");
  }
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can edit their tweet");
  }
  const newTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: { content: newContent },
    },
    { returnDocument: "after" }
  );

  if (!newTweet) {
    throw new ApiError(500, "Failed to edit tweet please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet updated successfully", newTweet));
});

//!DELETE TWEET
const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet");
  }
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can delete their tweet");
  }
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  await Like.deleteMany({
    tweet: tweetId,
    likedBy: req.user,
  });
  if (!deletedTweet) {
    throw new ApiError(500, "Failed to delete tweet please try again");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet deleted successfully", deletedTweet));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getAllTweets };
