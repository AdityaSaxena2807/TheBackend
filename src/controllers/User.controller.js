import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//! Generate Access and Refresh Tokens
const generateAccessAndRefreshToken = async (userId) => {
  try {
    //take userId and generate access and refresh tokens and save the refresh token in the database
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    //store the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //validateBeforeSave is used to skip the validation while saving the user
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

//! REGISTER USER
/** 
 take user details (from frontend)
 validate them
 check if no required field is empty
 when enter is clicked check if user already exists or not
 //check for images, check for avatar
 //*upload them to cloudinary
 //* create user object - create entry in db
 //*remove password and refresh token field from response
 //*check for user creation
 //*return res
 **/
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);
  //check if nothing is empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
    //some is used to check if any of the fields are empty or not (returns true if any of the fields are empty)
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check if user already exists
  const existingUser = await User.findOne({
    //we can use multiple operators after dollar sign like or, and, not etc.
    //$or is used to check if the email or username is already taken
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError(400, "User with email or username already exists");
  }

  //check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is required");
  }
  //upload images to cloudinary
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
  // console.log("avatarResponse: ", avatarResponse);
  // console.log("coverImageResponse: ", coverImageResponse);
  if (!avatarResponse || !coverImageResponse) {
    throw new ApiError(500, "Failed to upload images");
  }

  //create user object
  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    avatar: avatarResponse?.url || "",
    coverImage: coverImageResponse?.url || "",
    password,
  });
  //remove password and refresh token from the response while checking for user creation
  //select is used to select the fields that we want to return in the response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
    //-password means that the password field will not be returned in the response
    //-refreshToken means that the refresh token field will not be returned in the response
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  //return the response
  //status is used to set the status code of the response
  //json is used to send the response in json format
  //new ApiResponse is used to create a new ApiResponse object
  //201 is the status code for created
  //"User created successfully" is the message that will be returned in the response
  //createdUser is the data that will be returned in the response
  return res
    .status(201)
    .json(new ApiResponse(201, "User created successfully", createdUser));
});

//! LOGIN USER
/** 
 take user details (from req body)
 decide if the user should be logged it from username or email
 when enter is clicked check if user already exists or not
 validate them
 check if no required field is empty
 generate access and refresh tokens
 send cookies
 fetch details of user from database and display
**/
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({
    //these are mongo db operators
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(400, "User with email or username not found");
  }
  //check if password is correct
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }
  //generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    //password and refresh token should not be sent to the client
    "-password -refreshToken"
  );
  // here options are used to set the cookies in the response
  //httpOnly is used to set the cookie to be httpOnly
  //secure is used to set the cookie to be secure
  const Options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, Options)
    .cookie("refreshToken", refreshToken, Options)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

//! LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    //unset is used to remove the field from the document by passing a flag(1) or true for the field to be removed
    { $unset: { refreshToken: 1 } },
    //new is used to return the updated document
    { returnDocument: "after" }
  );

  const Options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", Options)
    .clearCookie("refreshToken", Options)
    .json(new ApiResponse(200, "User logged out successfully", {}));
});

//! REFRESH ACCESS TOKEN
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  //verify the refresh token
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    /** Example:
        Let's say you have a locked box (token) with information inside it like {"user_id": "1234"}.
        You use a secret key like mysecretkey to lock it.
        When the server receives the token, it uses mysecretkey to unlock it.
        If the secret key matches, the server gets the payload {"user_id": "1234"} and trusts the information.
        If it doesn't match (someone tries to tamper with the token), it will throw an error, and the server will reject the token.**/
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "Invalid refresh token");
    }
    //check if the refresh token in the database matches the incoming refresh token as an extra security measure to prevent token reuse after logout or token theft
    if (user?.refreshToken != incomingRefreshToken) {
      throw new ApiError(400, "Refresh token is expired or invalid");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, "Access token refreshed successfully", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid refresh token");
  }
});

//! CHANGING CURRENT PASSWORD
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(
    new ApiResponse(200, "Password changed successfully", {
      newPassword: newPassword,
    })
  );
});

//! GET CURRENT USER DETAILS
const currentUser = asyncHandler(async (req, res) => {
  //using res directly because data is already fetched in auth.middleware.js
  return res
    .status(200)
    .json(new ApiResponse(200, "Current user fetched successfully", req.user));
});

//! UPDATE ACCOUNT
const updateAccount = asyncHandler(async (req, res) => {
  //it is a good practice to use different controller for file updates
  const { fullName, email } = req.body;
  //validate the fields
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  //find the user
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { returnDocument: "after" }
    //new: true means that the updated document will be returned
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, "Account details updated successfully", user));
});

//! UPDATE  AVATAR
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  console.log(req.file.path);
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading Avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { returnDocument: "after" }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar updated successfully", user));
});

//! UPDATE COVER IMAGE
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Something went wrong while uploading cover image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { returnDocument: "after" }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, "Cover Image updated successfully", user));
});

//! GET USER CHANNEL PROFILE
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }
  const channel = await User.aggregate([
    {
      //match is used to find the user with the given username
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      //lookup is used to join the collection
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        // from takes the name of the collection which we want to join
        // localField takes the field from the collection which we want to join
        // foreignField takes the field from the other collection which we want to join
        // as takes the name of the new field which will be created in the pipeline
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers", //returns the number of subscribers
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo", //returns the number of channels the user is subscribed to
        },
        //it is used to check if the user is subscribed to the channel
        //$in is used to check if the first argument is present in the second argument
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // project is used to select the fields that we want to return in the response
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Channel details fetched successfully", channel[0])
    );
});

//!GET WATCH HISTORY
const getWatchHistory = asyncHandler(async (req, res) => {
  //when we write req.user.id we does not get the mongodb object id but a string
  //so we convert it to a mongodb object id
  //const userId = req.user?._id;
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      // from takes the name of the collection which we want to join
      // localField takes the field from the collection which we want to join
      // foreignField takes the field from the other collection which we want to join
      // as takes the name of the new field which will be created in the pipeline
      $lookup: {
        from: "videos", // Join the "videos" collection
        localField: "watchHistory", // Use the user's watchHistory array
        foreignField: "_id", // Match each watched video ID to videos._id
        as: "watchHistory", // Store the joined video documents in watchHistory
        pipeline: [
          // Further process each matched video document
          {
            $lookup: {
              from: "users", // Join the "users" collection
              localField: "owner", // Use the owner field from each video
              foreignField: "_id", // Match owner ID to users._id
              as: "owner", // Store the joined user(s) in owner
              pipeline: [
                // Project only the fields we need for the owner
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch history fetched successfully",
        user[0].watchHistory
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  currentUser,
  updateAccount,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
