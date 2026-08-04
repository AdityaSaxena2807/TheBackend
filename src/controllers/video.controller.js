import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

//! GET ALL VIDEOS
const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination
  // controller for fetching all videos with search, filter, sorting and pagination

  // extracting query params from request URL
  // example:
  // /videos?page=1&limit=10&query=nodejs&sortBy=views&sortType=desc
  const {
    page = 1, // default page number is 1
    limit = 10, // default limit is 10
    query, // search text
    sortBy, // field name to sort by
    sortType, // asc or desc
    userId, // fetch videos of specific user
    channelIds, // comma-separated list of channel/owner IDs (subscriptions feed)
  } = req.query;

  // empty aggregation pipeline array
  // MongoDB will execute stages one by one
  const pipeline = [];

  // ======================================================`
  // SEARCH FUNCTIONALITY
  // ======================================================

  // check if search query exists
  if (query) {
    pipeline.push({
      $search: {
        index: "videos_search",
        compound: {
          should: [
            {
              autocomplete: {
                query,
                path: "title",
                score: {
                  boost: {
                    value: 5,
                  },
                },
              },
            },
            {
              autocomplete: {
                query,
                path: "description",
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    });
  }

  // ======================================================
  // FILTER BY USER ID
  // ======================================================

  // check if userId is provided
  if (userId) {
    // validate MongoDB ObjectId
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    // add match stage to filter videos by owner
    pipeline.push({
      $match: {
        // owner field must match given userId
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // ======================================================
  // FILTER BY MULTIPLE CHANNEL IDS (subscriptions feed)
  // ======================================================

  if (channelIds) {
    // channelIds arrives as a comma-separated string, e.g. "id1,id2,id3"
    const idArray = channelIds
      .split(",")
      .filter((id) => isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (idArray.length > 0) {
      pipeline.push({
        $match: {
          owner: { $in: idArray },
        },
      });
    }
  }

  // ======================================================
  // FETCH ONLY PUBLISHED VIDEOS AND FILTER BY VISIBILITY
  // ======================================================

  pipeline.push({
    $match: {
      isPublished: true,
      $or: [
        { visibility: "public" },
        { owner: new mongoose.Types.ObjectId(req.user?._id) },
      ],
    },
  });
  // ======================================================
  // SORTING
  // ======================================================

  // check if sortBy and sortType are provided
  if (sortBy && sortType) {
    // add sorting stage
    pipeline.push({
      $sort: {
        // dynamic field sorting
        // example:
        // { views: -1 }

        // asc => 1
        // desc => -1
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    // default sorting if no sort params provided
    // latest videos first
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
  }

  // ======================================================
  // LOOKUP OWNER DETAILS
  // ======================================================

  pipeline.push(
    {
      // joins videos collection with users collection
      $lookup: {
        // collection name to join with
        from: "users",

        // field from videos collection
        localField: "owner",

        // field from users collection
        foreignField: "_id",

        // output array field name
        as: "ownerDetails",

        // pipeline inside lookup
        pipeline: [
          {
            // select only required user fields
            $project: {
              // include username
              username: 1,

              // include avatar url only
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      // lookup returns array
      // unwind converts array into object

      // before:
      // ownerDetails: [ {...} ]

      // after:
      // ownerDetails: { ... }

      $unwind: "$ownerDetails",
    }
  );

  // ======================================================
  // CREATE AGGREGATE QUERY
  // ======================================================

  // creates aggregation query using pipeline
  const videoAggregate = Video.aggregate(pipeline);

  // ======================================================
  // PAGINATION OPTIONS
  // ======================================================

  const options = {
    // convert page string into number
    page: parseInt(page, 10),

    // convert limit string into number
    limit: parseInt(limit, 10),
  };

  // ======================================================
  // EXECUTE AGGREGATION WITH PAGINATION
  // ======================================================

  // mongoose-aggregate-paginate-v2 plugin method
  const video = await Video.aggregatePaginate(videoAggregate, options);

  // ======================================================
  // SEND RESPONSE
  // ======================================================

  return res.status(200).json(
    // custom API response
    new ApiResponse(200, "Videos fetched successfully", video)
  );
});

//! PUBLISH A VIDEO
const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const { title, description, visibility } = req.body;
  if ([title, description, visibility].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
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
    throw new ApiError(400, "Video is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail Image is required");
  }

  const videoResponse = await uploadOnCloudinary(videoLocalPath);
  const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoResponse || !thumbnailResponse) {
    throw new ApiError(500, "Failed to upload Video or thumbnail");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: {
      url: videoResponse.url,
      public_id: videoResponse.public_id,
    },
    thumbnail: {
      url: thumbnailResponse.url,
      public_id: thumbnailResponse.public_id,
    },
    duration: Math.round(videoResponse.duration) || "",
    owner: req.user?._id,
    visibility: visibility === "private" ? "private" : "public",
  });
  if (!video) {
    throw new ApiError(500, "Something went wrong while uploading video");
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
  if (req.user?._id) {
    if (!isValidObjectId(req.user?._id)) {
      throw new ApiError(400, "Invalid userId");
    }
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
            },
          },
          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
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
        "owner._id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
        "owner.subscribersCount": 1,
        "owner.isSubscribed": 1,
        likesCount: 1,
        views: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);
  if (!videoFile || videoFile.length === 0) {
    throw new ApiError(404, "Video not found");
  }
  if (videoFile[0].owner?._id?.toString() !== req.user?._id?.toString()) {
    const rawVideo = await Video.findById(videoId).select("visibility owner");

    if (
      rawVideo.visibility === "private" &&
      rawVideo.owner.toString() !== req.user?._id?.toString()
    ) {
      throw new ApiError(403, "This video is private");
    }
  }

  const ip = req.ip;
  let updatedVideo;

  if (req.user?._id) {
    updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $addToSet: { "viewedBy.userId": req.user._id } },
      { returnDocument: "after" } // returns the updated doc
    );
  } else {
    updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $addToSet: { "viewedBy.Ip": ip } },
      { returnDocument: "after" }
    );
  }
  const viewCount =
    updatedVideo.viewedBy.userId.length + updatedVideo.viewedBy.Ip.length;

  await Video.findByIdAndUpdate(videoId, { views: viewCount });

  // add this video to user watch history
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        watchHistory: videoId,
      },
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "video details fetched successfully", videoFile[0])
    );
});

//! UPDATE VIDEO DETAILS
const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { title, description } = req.body;
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You can't edit this video as you are not the owner"
    );
  }

  const updateFields = { title, description };

  const thumbnailLocalPath = req.file?.path;
  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail?.url) {
      throw new ApiError(400, "Thumbnail upload failed");
    }

    // delete old thumbnail from cloudinary only after the new one uploads successfully
    if (video.thumbnail?.public_id) {
      await deleteOnCloudinary(video.thumbnail.public_id);
    }

    updateFields.thumbnail = {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    };
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updateFields,
    },
    { returnDocument: "after" }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video. Please try again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Video updated successfully", updatedVideo));
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
    .json(new ApiResponse(200, "Video deleted successfully", deletedVideo));
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
  return res.status(200).json(
    new ApiResponse(200, "Publish status toggled successfully", {
      isPublished: status.isPublished,
    })
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
