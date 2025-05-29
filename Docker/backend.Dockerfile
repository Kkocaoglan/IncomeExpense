FROM node:20-alpine AS builder
WORKDIR /app
COPY ./Backend/package.json .
RUN npm install
COPY ./Backend .

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 5001
ENV NODE_ENV=production
CMD ["npm", "start"]
