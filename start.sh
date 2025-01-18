
docker compose -f docker-compose.prod.yml build --no-cache express
docker compose -f docker-compose.prod.yml up -d
docker exec flashscore-tracker-express-1 npx prisma db push