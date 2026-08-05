import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },
    coverImage: {
      url: String,
      public_id: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
    securityQuestion: {
      type: String,
      required: true,
    },
    securityAnswer: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  // here this.isModified is a method that checks if the password field has been modified or not.
  // If it has been modified, then we hash the password before saving it to the database.
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    //bcrypt has a method hash which takes the password and the salt rounds (10 in this case) and returns a hashed version of the password
  }
  //pre is a middleware function that runs before saving the data to the database document

  // here this.isModified is a method that checks if the securityAnswer field has been modified or not.
  if (this.isModified("securityAnswer")) {
    this.securityAnswer = await bcrypt.hash(
      this.securityAnswer.toLowerCase().trim(),
      10
    );
    // Hash the security answer before saving it to the database
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
  //bcrypt has a method compare which takes the password and the hashed password and returns true if they match and false if they don't
};

userSchema.methods.isSecurityAnswerCorrect = async function (answer) {
  return await bcrypt.compare(answer.toLowerCase().trim(), this.securityAnswer);
};

userSchema.methods.generateAccessToken = function () {
  //jwt.sign method is used to generate a token
  //jwt.sign method takes three arguments: payload, secret, options
  //payload is the data that will be stored in the token
  //secret is the secret key that will be used to sign the token
  //options is the options for the token generation
  return jwt.sign(
    {
      _id: this.id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
