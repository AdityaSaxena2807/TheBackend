# 🦆 DUCKY — Backend API

A production-ready **scalable backend system** for a modern video-sharing platform, built with **Node.js, Express, and MongoDB**.
DUCKY provides a robust API layer for handling users, videos, interactions, and real-time engagement features.

---

## 🚀 Overview

DUCKY backend is designed with a **modular, scalable architecture** following industry best practices. It powers core features such as:

- User authentication & session management
- Video publishing & streaming metadata
- Social interactions (likes, comments, subscriptions)
- Playlist and content organization
- Creator analytics dashboard

The system emphasizes **clean architecture, reusable utilities, and efficient database querying using MongoDB aggregations**.

---

## 🏗️ Architecture

The project follows a **layered architecture pattern**:

```bash
src/
├── controllers/     # Business logic (feature-wise separation)
├── models/          # Mongoose schemas & data layer
├── routes/          # API route definitions
├── middlewares/     # Auth, error handling, request processing
├── utils/           # Shared utilities (API response, error, async handler)
├── db/              # Database connection
├── app.js           # Express app configuration
└── index.js         # Application entry point
```

Reference from project structure:

---

## 🧩 Core Modules

### 👤 Authentication & Users

- Secure registration & login (JWT + cookies)
- Access & refresh token strategy
- Profile management with avatar & cover image upload

### 🎥 Video System

- Video metadata management
- Visibility control (public/private)
- Optimized querying with aggregation pipelines

### 💬 Comments

- Add, update, delete comments
- Like/unlike comments
- Pagination with aggregation

### ❤️ Likes System

- Unified like system for:
  - Videos
  - Comments
  - Tweets

- Efficient toggle mechanism

### 📂 Playlists

- Create and manage playlists
- Add/remove videos
- Aggregate playlist stats (views, count)

### 🔔 Subscriptions

- Subscribe/unsubscribe to channels
- Fetch subscribers & subscribed channels

### 🐦 Tweets (Micro-content)

- Lightweight posting system
- Like support & pagination

### 📊 Dashboard

- Channel analytics:
  - Total views
  - Total likes
  - Subscriber count
  - Video count

### 🩺 Healthcheck

- API status endpoint for monitoring

---

## ⚙️ Tech Stack

| Layer       | Technology                         |
| ----------- | ---------------------------------- |
| Runtime     | Node.js                            |
| Framework   | Express.js                         |
| Database    | MongoDB + Mongoose                 |
| Auth        | JWT (Access + Refresh Tokens)      |
| File Upload | Multer + Cloudinary                |
| Utilities   | Custom API response/error handling |

---

## 🔐 Security & Best Practices

- HTTP-only secure cookies for tokens
- Centralized error handling middleware
- Input validation and sanitization
- Protected routes via auth middleware
- Separation of concerns (controller/service pattern)

---

## ⚡ Key Highlights

- 📈 **Advanced MongoDB Aggregations** for performance
- 🔄 **Pagination-ready APIs**
- 🧱 **Modular and scalable codebase**
- 🧪 Clean API response structure (`ApiResponse`)
- 🚫 Consistent error handling (`ApiError`)
- ☁️ Cloudinary integration for media

---

## 🛠️ Getting Started

### 1. Clone Repository

```bash
git clone <repository-url>
cd ducky-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file:

```env
PORT=8000
MONGO_URI=your_mongodb_uri
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

### 4. Run Server

```bash
npm run dev
```

---

## 📡 API Base URL

```
http://localhost:8000/api/v1
```

---

## 📌 Example Routes

| Method | Endpoint                    | Description       |
| ------ | --------------------------- | ----------------- |
| POST   | `/users/register`           | Register user     |
| POST   | `/users/login`              | Login             |
| GET    | `/videos`                   | Get videos        |
| POST   | `/comments/:videoId`        | Add comment       |
| POST   | `/likes/video/:videoId`     | Toggle video like |
| POST   | `/subscriptions/:channelId` | Subscribe         |

---

## 🧠 Design Principles

- **Scalability first** — modular codebase
- **Performance focused** — aggregation pipelines
- **Clean API contracts** — consistent response structure
- **Developer friendly** — reusable utilities & clear separation

---

## 🧪 Testing

Postman collection included:

```
Aditya.postman_collection.json
```

---

## 📦 Scripts

```bash
npm run dev     # Development server
npm start       # Production server
```

---

## 👨‍💻 Author

**Aditya Saxena**
MERN Stack Developer
VIT Vellore (2025 Graduate)

---

## 📄 License

This project is licensed under the MIT License.
