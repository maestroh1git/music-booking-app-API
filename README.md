# Music Booking App API - Industry Hub

A robust and scalable REST API for a Music Booking Application, built with NestJS and TypeScript. This API enables users to book artists for events, manage artist profiles, and handle event listings.

## 🎯 Features

- **Authentication & Authorization**
  - Secure user authentication
  - Role-based access control
  - JWT token management

- **Artist Management**
  - Artist profile creation and management
  - Portfolio management
  - Availability tracking

- **Event Management**
  - Event creation and listing
  - Event details and scheduling
  - Event status tracking

- **Booking System**
  - Secure booking transactions
  - Booking status management
  - Payment integration

- **Additional Features**
TODO
  - File uploads for media content
  - Review and rating system
  - Analytics tracking
  - Notification system

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
TODO
- **File Storage**: Local/Cloud storage
- **API Documentation**: Swagger/OpenAPI

## 📁 Project Structure

```
src/
├── auth/           # Authentication module
├── artists/        # Artist management
├── bookings/       # Booking system
├── events/         # Event management
├── users/          # User management
├── common/         # Shared utilities
├── config/         # Configuration
TODO
├── uploads/        # File upload handling
├── reviews/        # Review system
├── notifications/  # Notification system
└── analytics/      # Analytics tracking
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [https://github.com/maestroh1git/music-booking-app-API.git]
cd music-booking-app-API
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run start:dev
```

## 📚 API Documentation

The API documentation is available at [Postman Link](https://planetary-space-650600.postman.co/workspace/Gambl~dfc9281d-0434-4abb-a1a5-b32f87177b57/collection/40703321-0c5173da-2867-48f5-bf30-f4955fad3ecb?action=share&creator=40703321&active-environment=40703321-40550016-6df8-43a8-ac9e-e258771be588). It includes:
- Endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests

## 🔒 Security Features

- JWT-based authentication
- Password hashing
- Role-based access control
- Input validation with whitelist and transform options
- Basic NestJS security features

## 📦 Deployment

The application can be deployed using:
```bash
npm run build
npm run start:prod
```