import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
      required: true,
      unique: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      required: true,
      default: 0,
    },
    viewedBy: {
      userId: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      Ip: [
        {
          type: String,
        },
      ],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  { timestamps: true }
);
videoSchema.plugin(mongooseAggregatePaginate);
// here plugin is used to paginate the videos when fetching them from the database. It allows for efficient querying
// and retrieval of video data in a paginated format, which is especially useful when dealing with large datasets.
export const Video = mongoose.model("Video", videoSchema);
