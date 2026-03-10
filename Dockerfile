# Use a lightweight Node.js image
FROM node:22-slim

# Create and define the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Ensure the temp_audio directory exists for TTS/Voice processing
RUN mkdir -p temp_audio

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "dev"]
