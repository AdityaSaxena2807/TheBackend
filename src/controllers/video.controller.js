import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

//! GET ALL VIDEOS
const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
});

//! PUBLISH A VIDEO
const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description } = req.body;
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError("All fields are required", 400);
  }
  const existingVideo = await Video.findOne({ title, description });
  if (existingVideo) {
    throw new ApiError(
      "Video with same title and same description already exists",
      409
    );
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  console.log("Video path:", videoLocalPath);
  console.log("Thumbnail path:", thumbnailLocalPath);
  if (!videoLocalPath) {
    throw new ApiError("Video is required", 400);
  }
  if (!thumbnailLocalPath) {
    throw new ApiError("Thumbnail Image is required", 400);
  }

  const videoResponse = await uploadOnCloudinary(videoLocalPath);
  const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoResponse || !thumbnailResponse) {
    throw new ApiError("Failed to upload Video or thumbnail", 500);
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
    throw new ApiError("Something went wrong while uploading video", 500);
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "Video Published successfully", video));
});

//! GET VIDEO BY ID
const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;
  const videoFile = await Video.findById(videoId);
  if (!videoFile) {
    throw new ApiError(400, "Video file not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(201, "Video Found", videoFile));
  //TODO: get complete details using aggregation pipelines along with comments ,likes, owner Details
  
});

//! UPDATE VIDEO DETAILS
const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
});

//! DELETE A VIDEO
const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  const { videoId } = req.params;
});

//! TOGGLE VIDEO PUBLISH STATUS
const togglePublishStatus = asyncHandler(async (req, res) => {
  // TODO: toggle video publish status
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
