# Use Node.js base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Expose Metro bundler port
EXPOSE 8081

# Start React Native Metro server
CMD ["npx", "react-native", "start"]