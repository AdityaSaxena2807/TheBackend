import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//!CREATE TWEET
const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Tweet body is missing");
  }
  const existingTweet = await Tweet.findOne({ content });
  if (existingTweet && existingTweet.owner.equals(req.user?._id)) {
    throw new ApiError(409, "Tweet with same content and owner already exists");
    //we use 409 status code for conflict error when a resource already exists with the same content and owner
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
    //we dont take owner from req.body because we want to set the owner of the tweet to the user who is creating the tweet and we can get the user from the req.user object which is set by the verifyJWT middleware
  });
  return res
    .status(201)
    .json(new ApiResponse(201, "Tweet created successfully", tweet));
});

//!GET USER TWEETS
const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "user not found");
  }
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
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
              "avatar.url": 1,
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
                new mongoose.Types.ObjectId(req.user?._id),
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
        "ownerDetails.username": 1,
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

export { createTweet, getUserTweets, updateTweet, deleteTweet };
