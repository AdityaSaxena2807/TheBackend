import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { optionalAuth } from "../middlewares/noAuth.middleware.js";

const router = Router();

//router.use(verifyJWT);
// Apply verifyJWT middleware to all routes in this file

router.route("/:videoId").get(optionalAuth, getVideoComments);
router.route("/:videoId").post(verifyJWT, addComment);
router
  .route("/c/:commentId")
  .delete(verifyJWT, deleteComment)
  .patch(verifyJWT, updateComment);

export default router;
