# Use an official Node.js runtime as the base image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that the application runs on
EXPOSE 3010

# Command to run the application
CMD ["npm", "start"]