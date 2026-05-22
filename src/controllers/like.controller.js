import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
//! TOGGLE LIKE ON VIDEO
const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }
  await Like.create({
    likedOn: "video",
    video: videoId,
    likedBy: req.user._id,
  });
  const likesCount = await Like.countDocuments({ video: videoId });
  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true, likesCount }));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  const likedAlready = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }
  await Like.create({
    comment: commentId,
    likedBy: req.user._id,
    likedOn: "comment",
  });
  const likesCount = await Like.countDocuments({ comment: commentId });
  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true, likesCount }));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on tweet
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  const likedAlready = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }
  await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
    likedOn: "tweet",
  });
  const likesCount = await Like.countDocuments({ tweet: tweetId });
  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true, likesCount }));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
