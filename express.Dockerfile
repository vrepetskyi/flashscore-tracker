FROM node:22

WORKDIR /app
COPY . .

RUN <<EOF
npm i -f
npm run build
npx prisma db push
EOF

EXPOSE ${PORT}
CMD ["npm", "start"]
