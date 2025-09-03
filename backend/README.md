# MentorLink Backend

Backend API for MentorLink application built with Node.js, Express, and MongoDB.

## Features

- User authentication with OTP verification
- Mentor and student profile management
- Email OTP sending via Gmail
- MongoDB database integration
- CORS enabled for frontend connection

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

3. Configure environment variables:
   - `MONGO_URI`: Your MongoDB connection string (use MongoDB Atlas for network access)
   - `JWT_SECRET`: A secret key for JWT tokens
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Gmail app password (not regular password)
   - `PORT`: Server port (default 5000)

4. Start the server:
   ```
   npm run dev  # For development with nodemon
   npm start    # For production
   ```

## API Endpoints

### Users
- `POST /api/users/signup` - Register a new user
- `POST /api/users/verify-otp` - Verify email with OTP
- `POST /api/users/login` - Login with email and password
- `POST /api/users/send-login-otp` - Send OTP for login
- `POST /api/users/login-otp` - Login with OTP

### Mentors
- `POST /api/mentors` - Create or update mentor profile

### Students
- `POST /api/students` - Create or update student profile

## MongoDB Connection String

For network access, use MongoDB Atlas:
1. Create a free account at https://www.mongodb.com/atlas
2. Create a cluster
3. Get the connection string from "Connect" > "Connect your application"
4. Replace `<username>`, `<password>`, and `<database>` in the string
5. Ensure IP whitelist allows access from anywhere (0.0.0.0/0) for public access

Example connection string:
```
mongodb+srv://username:password@cluster0.mongodb.net/mentorlink?retryWrites=true&w=majority
```

## Gmail Setup for OTP

1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: https://support.google.com/accounts/answer/185833
3. Use the app password in `EMAIL_PASS` (not your regular password)

## Connecting to Frontend

The backend is configured with CORS to allow requests from the frontend. Make sure your frontend makes API calls to `http://localhost:5000` (or your configured port).
