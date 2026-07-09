# TheBackend

A Node.js and Express backend for a video-sharing / social-media style application. It supports user authentication, video publishing, comments, likes, playlists, subscriptions, tweets, and dashboard analytics.

## Features

- User registration, login, logout, token refresh, and profile management
- Secure JWT-based authentication with cookies
- Video upload and management with Cloudinary integration
- Comments, likes, playlists, subscriptions, and tweets
- Optional authentication middleware for public access to some endpoints
- MongoDB database integration with Mongoose
- Centralized API error handling and consistent response format

## Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT for authentication
- Cloudinary for media uploads
- Multer for file uploads
- Cookie-parser and CORS
- Nodemon for development

## Project Structure

```bash
src/
  app.js              # Express app configuration
  index.js            # Server entry point
  constants.js        # Application constants
  controllers/        # Request handlers
  db/                 # Database connection setup
  middlewares/        # Auth, error handling, upload middleware
  models/             # Mongoose schemas and models
  routes/             # API routes
  utils/              # Helpers and API response utilities
```

## Prerequisites

Make sure you have the following installed:

- Node.js (recommended: 18+)
- MongoDB instance or MongoDB Atlas connection string
- Cloudinary account for media uploads

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with the following variables:

```env
PORT=8000
MONGODB_URL=mongodb://127.0.0.1:27017
DB_NAME=my_database
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Running the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on:

```bash
http://localhost:8000
```

## API Overview

### Health Check

- `GET /api/v1/healthcheck`

### Users

- `POST /api/v1/users/register`
- `POST /api/v1/users/login`
- `POST /api/v1/users/logout`
- `POST /api/v1/users/refresh-token`
- `POST /api/v1/users/change-password`
- `GET /api/v1/users/current-user`
- `PATCH /api/v1/users/update-account`
- `PATCH /api/v1/users/avatar`
- `PATCH /api/v1/users/coverImage`
- `GET /api/v1/users/c/:username`
- `GET /api/v1/users/watch-history`

### Videos

- `GET /api/v1/videos`
- `POST /api/v1/videos`
- `GET /api/v1/videos/:videoId`
- `PATCH /api/v1/videos/:videoId`
- `DELETE /api/v1/videos/:videoId`
- `PATCH /api/v1/videos/toggle/publish/:videoId`

### Tweets

- `POST /api/v1/tweets`
- `GET /api/v1/tweets/user/:userId`
- `PATCH /api/v1/tweets/:tweetId`
- `DELETE /api/v1/tweets/:tweetId`

### Comments

- `GET /api/v1/comments/:videoId`
- `POST /api/v1/comments/:videoId`
- `PATCH /api/v1/comments/c/:commentId`
- `DELETE /api/v1/comments/c/:commentId`

### Likes

- `POST /api/v1/likes/toggle/v/:videoId`
- `POST /api/v1/likes/toggle/c/:commentId`
- `POST /api/v1/likes/toggle/t/:tweetId`
- `GET /api/v1/likes/videos`

### Playlists

- `POST /api/v1/playlists`
- `GET /api/v1/playlists/:playlistId`
- `PATCH /api/v1/playlists/:playlistId`
- `DELETE /api/v1/playlists/:playlistId`
- `PATCH /api/v1/playlists/add/:videoId/:playlistId`
- `PATCH /api/v1/playlists/remove/:videoId/:playlistId`
- `GET /api/v1/playlists/user/:userId`

### Subscriptions

- `GET /api/v1/subscriptions/c/:channelId`
- `POST /api/v1/subscriptions/c/:channelId`
- `GET /api/v1/subscriptions/u/:subscriberId`

### Dashboard

- `GET /api/v1/dashboard/stats`
- `GET /api/v1/dashboard/videos`

## Notes

- The backend is configured to accept requests from `http://localhost:5173` via CORS.
- Media files are uploaded to Cloudinary and stored temporarily before being handled by the upload utility.
- Authentication is enforced on protected routes using JWT tokens from cookies or the `Authorization` header.

## License

This project is licensed under ISC.
