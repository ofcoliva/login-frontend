# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM oven/bun:1.3-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN VITE_API_BASE_URL=${VITE_API_BASE_URL} bun run build

# ---------- Runtime stage ----------
FROM nginx:stable-alpine AS runtime

COPY nginx.main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Roda o nginx diretamente (sem /docker-entrypoint.sh, cujos scripts fazem
# sed -i e quebrariam com rootfs read_only). Logs já são symlinks para
# stdout/stderr na imagem base.
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]

EXPOSE 8080
