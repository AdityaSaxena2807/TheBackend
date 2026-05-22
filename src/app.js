import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
//routes import
import userRouter from "./routes/user.routes.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";
//cookie-parser's role is that it allows the server to perform crud operation on the cookies in browser of the client

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
//this app.use is used for middlewares and configurations of the app
app.use(express.json({ limit: "16kb" }));
//this means i am accepting json data in the request body and the limit is 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
//this means i am accepting urlencoded data in the request body and
// extended: true means that i can accept nested objects in the urlencoded data
app.use(express.static("public"));
//this means that i am saving static files in the public folder which
// can be accessed by the client without any authentication(publicly accessible) (eg: images, css files, js files)
app.use(cookieParser());

//routes import

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use(errorHandler);
/** 
here /api/v1/users is the prefix for all the routes in userRouter. So, if there is 
a route /register in userRouter, then it will be accessed as /api/v1/users/register in the app.
//* so the link will look like this: http://localhost:8000/api/v1/users/register
**/
export default app;
