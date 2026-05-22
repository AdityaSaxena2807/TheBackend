import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//!CREATE TWEET
const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  if (!content) {
    throw new ApiError("Tweet body is missing", 400);
  }
  const existingTweet = await Tweet.findOne({ content });
  if (existingTweet && existingTweet.owner.equals(req.user?._id)) {
    throw new ApiError("Tweet with same content and owner already exists", 409);
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
  // const { userId } = req.params;
  // if (!userId) {
  //   throw new ApiError(400, "user not found");
  // }
  // const tweets = await User.aggregate([]);
});

//!UPDATE TWEET
const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { newContent } = req.body;
  const { tweetId } = req.params;
  if (!newContent) {
    throw new ApiError("New body of tweet is missing", 400);
  }
  // isValidObjectId is a method provided by mongoose to check if the given id is a valid ObjectId or not
  if (!isValidObjectId(tweetId)) {
    throw new ApiError("Invalid tweet", 400);
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
    { new: true }
  );

  if (!newTweet) {
    throw new ApiError(500, "Failed to edit tweet please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newTweet, "Tweet updated successfully"));
});

//!DELETE TWEET
const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError("Invalid tweet", 400);
  }
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can delete their tweet");
  }
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deletedTweet) {
    throw new ApiError(500, "Failed to delete tweet please try again");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
