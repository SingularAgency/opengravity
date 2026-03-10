# Stage 1: Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy configuration files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including typescript for building)
RUN npm install

# Copy source code
COPY src ./src

# Build the TypeScript project into /app/dist
RUN npm run build

# Stage 2: Runtime stage
FROM node:22-slim

WORKDIR /app

# Copy only production dependency files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Ensure the temp_audio directory exists for TTS processing
RUN mkdir -p temp_audio

# Set environment to production
ENV NODE_ENV=production

# Start the application using node dist/index.js
CMD ["npm", "start"]
