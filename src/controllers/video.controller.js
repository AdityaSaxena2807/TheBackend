import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

// GET ALL VIDEOS
const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
});

//! PUBLISH A VIDEO
const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400,"All fields are required");
  }
  const existingVideo = await Video.findOne({ title, description });
  if (existingVideo) {
    throw new ApiError(
      400,
      "Video with same title and same description already exists"
    );
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  console.log("Video path:", videoLocalPath);
  console.log("Thumbnail path:", thumbnailLocalPath);
  if (!videoLocalPath) {
    throw new ApiError(400,"Video is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400,"Thumbnail Image is required");
  }

  const videoResponse = await uploadOnCloudinary(videoLocalPath);
  const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoResponse || !thumbnailResponse) {
    throw new ApiError(500,"Failed to upload Video or thumbnail");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoResponse?.url || "",
    thumbnail: thumbnailResponse?.url || "",
    duration: videoResponse?.duration || "",
    owner: req.user?._id,
  });
  if (!video) {
    throw new ApiError(500,"Something went wrong while uploading video");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "Video Published successfully", video));
});

//! GET VIDEO BY ID
const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid userId");
  }
  const videoFile = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
              pipeline: [
                {
                  $addFields: {
                    subscribersCount: {
                      $size: "$subscribers",
                    },
                    isSubscribed: {
                      $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likeDetails",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        owner: {
          $first: "$ownerDetails",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        "owner.username": 1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);
  if (!videoFile || videoFile.length === 0) {
    throw new ApiError(500, "failed to fetch video");
  }

  // increment views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // add this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoFile[0], "video details fetched successfully")
    );
});

// UPDATE VIDEO DETAILS
const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
});

//! DELETE A VIDEO
const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  const { videoId } = req.params;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Only owner can delete the video");
  }
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  await Like.deleteMany({
    video: videoId,
  });
  await Comment.deleteMany({
    video: videoId,
  });
  if (!deletedVideo) {
    throw new ApiError(500, "Failed to delete video please try again");
  }
  await deleteOnCloudinary(video.thumbnail.public_id); // video model has thumbnail public_id stored in it->check videoModel
  await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video
  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));
});

//! TOGGLE VIDEO PUBLISH STATUS
const togglePublishStatus = asyncHandler(async (req, res) => {
  // TODO: toggle video publish status
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't toggle publish status as you are not the owner"
    );
  }
  const status = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: { isPublished: !video.isPublished },
    },
    { returnDocument: "after" }
  );
  if (!status) {
    throw new ApiError(500, "Failed to toggle video publish status");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: status.isPublished },
        "Publish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
