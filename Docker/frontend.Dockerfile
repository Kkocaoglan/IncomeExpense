FROM node:20-alpine
WORKDIR /app
COPY ./Frontend/package.json .
RUN npm install && npm run build
COPY ./Frontend .

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
