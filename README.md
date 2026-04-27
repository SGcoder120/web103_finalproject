# Royal Flush

CodePath WEB103 Final Project

Designed and developed by: John Ortega, Shivesh Gupta, Christopher Persaud, Huyen Huynh

🔗 Link to deployed app: https://web103-finalproject-royalflush-1.onrender.com/

## About

### Description and Purpose

Royal Flush is a web application that helps users quickly locate nearby public restrooms using a public API. Beyond just finding restrooms, the app allows users to rate, review, and rank bathrooms based on cleanliness, accessibility, amenities, and overall experience.

The purpose of Royal Flush is to solve a very real, everyday problem—finding a reliable, clean restroom when you’re out. Many existing maps show locations, but they don’t tell you which bathroom is actually worth using.

### Inspiration

We all have had that moment where we really needed to use the bathroom, but we were far from home, and we just wanted to find the nearest bathroom available to do our business. However many of these bathrooms are filthy, or out right sketchy. Royal Flush helps us differentiate the good bathrooms from the bad ones.

## Tech Stack

Frontend: React.js, HTML, CSS, JavaScript

Backend: Node.js, Express.js

## Features

### Find Nearby Restrooms

Based on the users current location, the app fetches and locates all of the nearest public bathrooms in the area.

https://imgur.com/a/web-103-restroom-find-feature-coaMME3

### User Reviews & Rating

Allows users to submit ratings, upload images, and write descriptions about restroom conditions such as cleanliness and accessibility.

[gif goes here]

### Restroom Ranking System

Aggregates user feedback to rank restrooms, highlighting the best and worst options based on real user experiences.

[Insert GIF of ranked list or leaderboard view here]

### [ADDITIONAL FEATURES GO HERE - ADD ALL FEATURES HERE IN THE FORMAT ABOVE; you will check these off and add gifs as you complete them]

### Filter Bathrooms by preference

Allow for users to filter bathrooms by specific preferences such as distance, location, etc..

[gif goes here]

### User Authentication

Allows users to create accounts, log in, and manage their reviews, ensuring accountability and preventing spam or duplicate submissions.

[Insert GIF of login/signup flow here]

### Favorites & Bookmarks

Lets users save frequently used or highly rated restrooms for quick access later, improving convenience for repeat visits.

[Insert GIF of favoriting/bookmarking feature here]

## Installation Instructions

### Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)
- PostgreSQL database (local or cloud instance like Render, Supabase, etc.)
- GitHub OAuth App (for user authentication)
- Google Maps API key (for location services)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web103_finalproject-RoyalFlush
   ```

2. **Set up the server**
   ```bash
   cd server
   
   # Install dependencies
   npm install
   
   # Create .env file with required environment variables
   cp .env.example .env  # If .env.example exists, otherwise create .env manually
   ```

3. **Configure environment variables**
   
   Edit the `server/.env` file with your actual values:
   ```env
   # Database configuration
   PGDATABASE=your_database_name
   PGHOST=your_database_host
   PGPASSWORD=your_database_password
   PGPORT=5432
   PGUSER=your_database_user
   
   # GitHub OAuth (create an OAuth app at https://github.com/settings/applications/new)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
   
   # Session secret
   SECRET_KEY=your_random_secret_key
   
   # Google Maps API key (get from https://console.cloud.google.com/)
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # Server port (optional, defaults to 3001)
   PORT=3001
   ```

4. **Set up the database**
   ```bash
   # Reset and seed the database with initial data
   npm run reset
   npm run seed
   ```

5. **Set up the client**
   ```bash
   cd ../client
   
   # Install dependencies
   npm install
   ```

6. **Start the application**

   Open two terminal windows:

   **Terminal 1 - Start the server:**
   ```bash
   cd server
   npm run dev  # For development with auto-restart
   # or
   npm start    # For production
   ```

   **Terminal 2 - Start the client:**
   ```bash
   cd client
   npm run dev  # Starts development server on http://localhost:5173
   ```

7. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173`

### Additional Notes

- The server runs on port 3001 by default
- The client development server runs on port 5173
- Make sure your PostgreSQL database is running and accessible
- For production deployment, you'll need to update the `API_URL` in `client/src/App.jsx` and `client/src/api.js` with your production server URL
- Ensure your GitHub OAuth app is configured with the correct callback URL for your environment
