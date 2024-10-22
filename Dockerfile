# Use an official Node.js runtime as the base image
FROM node:18-bullseye

# Install FFmpeg and FFprobe
RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set environment variables for ffmpeg and ffprobe paths
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# Generate Prisma client
RUN npx prisma generate

# Build the main application
RUN npm run build

# Build the worker
RUN npm run build-worker

# Command to run the worker
CMD ["npm", "run", "start-worker"]