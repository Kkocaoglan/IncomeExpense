FROM node:20-alpine
WORKDIR /app

COPY package.json .

RUN npm install

COPY ./backend .

EXPOSE 5001

CMD ["npm", "start"]
