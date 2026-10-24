# Build: DOCKER_BUILDKIT=1 docker build --secret id=npm_token,env=NODE_AUTH_TOKEN --build-arg CONFIGURATION=production -t male-move/web .
FROM node:24-alpine AS build
WORKDIR /app
ARG CONFIGURATION=production
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN=$(cat /run/secrets/npm_token) npm ci --no-audit --no-fund
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src ./src
RUN npx ng build --configuration "$CONFIGURATION"

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/male-move/browser /usr/share/nginx/html
EXPOSE 8080
