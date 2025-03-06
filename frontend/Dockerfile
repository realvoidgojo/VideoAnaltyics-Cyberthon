# Use Node.js 18 for building
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Copy project files & build
COPY . .
RUN npm run build

# Serve static files using Nginx
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy built files from builder stage
COPY --from=builder /app/dist .

# Expose the correct port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
