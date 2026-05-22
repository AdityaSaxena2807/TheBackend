import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
      "Something went wrong while generating access and refresh tokens",
      500
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
    throw new ApiError("All fields are required", 400);
  }

  //check if user already exists
  const existingUser = await User.findOne({
    //we can use multiple operators after dollar sign like or, and, not etc.
    //$or is used to check if the email or username is already taken
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError("User with email or username already exists", 409);
  }

  //check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError("Avatar is required", 400);
  }
  if (!coverImageLocalPath) {
    throw new ApiError("Cover Image is required", 400);
  }
  //upload images to cloudinary
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
  //* console.log("avatarResponse: ", avatarResponse);
  //* console.log("coverImageResponse: ", coverImageResponse);
  if (!avatarResponse || !coverImageResponse) {
    throw new ApiError("Failed to upload images", 500);
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
    throw new ApiError("Something went wrong while registering user", 500);
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
    throw new ApiError("Username or email is required", 400);
  }
  const user = await User.findOne({
    //these are mongo db operators
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError("User with email or username not found", 404);
  }
  //check if password is correct
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError("Invalid password", 401);
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
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

//! LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    //unset is used to remove the field from the document by passing a flag(1) or true for the field to be removed
    { $unset: { refreshToken: 1 } },
    //new is used to return the updated document
    { new: true }
  );

  const Options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", Options)
    .clearCookie("refreshToken", Options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

//! REFRESH ACCESS TOKEN
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError("Unauthorized request", 401);
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
      throw new ApiError("Invalid refresh token", 404);
    }
    //check if the refresh token in the database matches the incoming refresh token as an extra security measure to prevent token reuse after logout or token theft
    if (user?.refreshToken != incomingRefreshToken) {
      throw new ApiError("Refresh token is expired or invalid", 404);
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
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(error?.message || "Invalid refresh token", 401);
  }
});

//! CHANGING CURRENT PASSWORD
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError("User not found", 404);
  }
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError("Invalid old password", 401);
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
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

//! UPDATE ACCOUNT
const updateAccount = asyncHandler(async (req, res) => {
  //it is a good practice to use different controller for file updates
  const { fullName, email } = req.body;
  //validate the fields
  if (!fullName || !email) {
    throw new ApiError("All fields are required", 400);
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
    { new: true }
    //new: true means that the updated document will be returned
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//! UPDATE  AVATAR
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError("Avatar is missing", 400);
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError("Something went wrong while uploading Avatar", 500);
  }
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

//! UPDATE COVER IMAGE
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.files?.path;

  if (coverImageLocalPath) {
    throw new ApiError("Cover Image is missing", 400);
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError("Something went wrong while uploading cover image", 500);
  }
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

//! GET CURRENT USER PROFILE
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError("Username is required", 400);
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
        isSubscribed: {
          $cond: {
            if: {
              //it is used to check if the user is subscribed to the channel
              //$in is used to check if the first argument is present in the second argument
              $in: ["req.user?._id", "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
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
    throw new ApiError("Channel not found", 404);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel details fetched successfully")
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
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipelines: [
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
        user[0].watchHistory,
        "Watch history fetched successfully"
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
