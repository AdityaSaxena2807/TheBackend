import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.error("Stack Trace:", err.stack); // Log the stack trace for debugging

  // Check if the error is an instance of ApiError
  if (err instanceof ApiError) {
    // If it's an ApiError, return the custom error format from ApiError utility
    return res.status(err.code || 500).json({
      success: err.success,
      message: err.message || "Something Went Wrong",
      errors: err.errors || [], // Send the errors array if it exists
      stack: process.env.NODE_ENV === "production" ? null : err.stack, // Don't send stack trace in production
    });
  }

  // For all other errors, use the default error handling
  const statusCode = err.statusCode || 500; // Default to 500 if no status code is set
  const message = err.message || "Internal Server Error"; // Default message for unexpected errors

  return res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack, // Hide stack trace in production
  });
};

export default errorHandler;
