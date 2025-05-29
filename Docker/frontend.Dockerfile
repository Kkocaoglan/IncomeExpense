FROM node:20-alpine AS build
WORKDIR /app
COPY ./Frontend/package.json .
RUN npm install
COPY ./Frontend .
ENV VITE_API_URL=http://localhost:5001
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./Frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
