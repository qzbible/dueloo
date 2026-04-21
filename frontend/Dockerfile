# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and build
COPY . .
# Frontend uses craco which needs environment variables during build
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN yarn build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Custom Nginx config to handle React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
