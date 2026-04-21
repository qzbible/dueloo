# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
# Vite uses VITE_ prefix for environment variables
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN npm run build

# Production stage
FROM nginx:alpine
# Vite build outputs to dist/ instead of build/
COPY --from=build /app/dist /usr/share/nginx/html

# Custom Nginx config to handle React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
