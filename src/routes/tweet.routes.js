import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getAllTweets,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { optionalAuth } from "../middlewares/noAuth.middleware.js";

const router = Router();
//router.use(verifyJWT);
// Apply verifyJWT middleware to all routes in this file

router.route("/").get(optionalAuth, getAllTweets).post(verifyJWT, createTweet);
router.route("/user/:userId").get(optionalAuth, getUserTweets);
router
  .route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);
export default router;
