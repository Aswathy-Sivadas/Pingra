# ═══════════════════════════════════════════════════════════════════════════════
#  Stage 1 — Build the React frontend
#
#  We build the frontend SEPARATELY so the final image only contains the
#  compiled dist/, not node_modules or source. This keeps the image small.
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files first — Docker caches this layer.
# If package.json hasn't changed, "npm install" is skipped on the next build.
COPY frontend/chat-app/package*.json ./frontend/chat-app/
RUN npm install --prefix frontend/chat-app

# Now copy the source and build
COPY frontend/chat-app/ ./frontend/chat-app/
RUN npm run build --prefix frontend/chat-app
# Output: /app/frontend/chat-app/dist/


# ═══════════════════════════════════════════════════════════════════════════════
#  Stage 2 — Production server
#
#  Only production backend dependencies + built frontend land in this image.
#  No devDependencies, no frontend source, no build tools.
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine

WORKDIR /app

# Root package.json is referenced by backend/package.json as "chatapp": "file:.."
COPY package.json ./

# Install ONLY production backend dependencies (--omit=dev skips nodemon etc.)
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Copy the compiled frontend to the path Express expects:
#   server.js runs from /app/backend → path.resolve() = /app/backend
#   path.join(__dirname, "../frontend/chat-app/dist") = /app/frontend/chat-app/dist
COPY --from=frontend-builder /app/frontend/chat-app/dist ./frontend/chat-app/dist

ENV NODE_ENV=production

# Render injects PORT automatically, but 3000 is the fallback
EXPOSE 3000

# Switch into the backend directory so path.resolve() returns /app/backend
WORKDIR /app/backend

CMD ["node", "src/server.js"]
