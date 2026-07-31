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
  if (
    video.visibility === "private" &&
    video.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "This video is private");
  }
  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    const likesCount = await Like.countDocuments({ video: videoId });
    return res.status(200).json(
      new ApiResponse(200, "Video has been unliked", {
        isLiked: false,
        likesCount,
      })
    );
  }
  await Like.create({
    likedOn: "video",
    video: videoId,
    likedBy: req.user._id,
  });
  const likesCount = await Like.countDocuments({ video: videoId });
  return res.status(200).json(
    new ApiResponse(200, "Video liked successfully", {
      isLiked: true,
      likesCount,
    })
  );
});

//! TOGGLE LIKE ON COMMENT
const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  const video = await Video.findById(comment.video).select("visibility owner");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (
    video.visibility === "private" &&
    video.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "This video is private");
  }
  const likedAlready = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
    const likesCount = await Like.countDocuments({ comment: commentId });
    return res.status(200).json(
      new ApiResponse(200, "Comment has been unliked", {
        isLiked: false,
        likesCount,
      })
    );
  }
  await Like.create({
    comment: commentId,
    likedBy: req.user._id,
    likedOn: "comment",
  });
  const likesCount = await Like.countDocuments({ comment: commentId });
  return res.status(200).json(
    new ApiResponse(200, "Comment liked successfully", {
      isLiked: true,
      likesCount,
    })
  );
});

//! TOGGLE LIKE ON TWEET
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
    const likesCount = await Like.countDocuments({ tweet: tweetId });
    return res.status(200).json(
      new ApiResponse(200, "Tweet has been unliked", {
        isLiked: false,
        likesCount,
      })
    );
  }
  await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
    likedOn: "tweet",
  });
  const likesCount = await Like.countDocuments({ tweet: tweetId });
  return res.status(200).json(
    new ApiResponse(200, "Tweet liked successfully", {
      isLiked: true,
      likesCount,
    })
  );
});

//! GET ALL LIKED VIDEOS
const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  // const likedVideos = await Like.find({ likedBy: req.user._id, likedOn: "video" }).populate("video");
  // const videos = likedVideos.map((like) => like.video);
  // return res.status(200).json(new ApiResponse(200, videos));
  const likesAggregate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        //Above is used when we want to extract all liked videos by current user

        likedOn: "video",
        // filters to only video likes (as opposed to comment/tweet likes)
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $match: {
        "likedVideo.isPublished": true,
        $or: [
          { "likedVideo.visibility": "public" },
          { "likedVideo.owner": new mongoose.Types.ObjectId(req.user._id) },
        ],
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedBy: 1,
        likedVideo: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, "liked videos fetched successfully", likesAggregate)
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
