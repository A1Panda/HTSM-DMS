FROM node:18-alpine AS client-build
WORKDIR /app
COPY client/package.json ./client/package.json
COPY client/package-lock.json* ./client/
RUN cd client && npm install
COPY client ./client
RUN cd client && npm run build

FROM node:18-alpine AS server-build
WORKDIR /app
COPY server/package.json ./server/package.json
RUN cd server && npm install --production
COPY server ./server

FROM node:18-alpine
WORKDIR /app
COPY --from=server-build /app/server ./server
COPY --from=client-build /app/client/build ./client/build
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node","server/src/app.js"]
