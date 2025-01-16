FROM node:22

WORKDIR /app
COPY . .

RUN npm i -f
RUN npm run build

EXPOSE ${PORT}
CMD ["npm", "start"]
