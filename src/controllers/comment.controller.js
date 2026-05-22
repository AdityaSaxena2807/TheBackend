import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

//!GET VIDEO COMMENTS
const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  //removing the await here because we are using aggregatePaginate which will handle the execution of the aggregate function and pagination together
  const commentsAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likeDetails",
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
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
      },
    },
  ]);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(commentsAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

//!ADD COMMENT TO VIDEO
const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
  if (!content) {
    throw new ApiError("Comment body is missing", 400);
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });
  if (!comment) {
    throw new ApiError(500, "Failed to add comment please try again");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

//!UPDATE COMMENT
const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  if (!content) {
    throw new ApiError("Comment body is missing", 400);
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can edit their Comment");
  }
  const updatedComment = await Comment.findByIdAndUpdate(
    comment?._id,
    {
      $set: {content: content},
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(500, "Failed to edit Comment please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

//!DELETE COMMENT
const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError("Comment not found", 400);
  }
  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can delete their Comment");
  }
  const oldComment = await Comment.findByIdAndDelete(commentId);

  await Like.deleteMany({
    comment: commentId,
    likedBy: req.user,
  });
  // when a comment is deleted, all the likes on that comment should also be deleted
  // we are using deleteMany because there can be multiple likes on a comment by different users
  if (!oldComment) {
    throw new ApiError(500, "Failed to edit Comment please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, oldComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
