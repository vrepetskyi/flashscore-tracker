# Flashscore Tracker

## How To Run

- Copy .env.example and rename it to .env
- Review the .env (default one can be used right away)
- Run ./start.sh

## How To Use

The app has 3 endpoints:

- `GET http://localhost:8080/api/v1/soccer/matches/upcoming/leagues` lists the leagues for which there are upcoming matches today
- `GET http://localhost:8080/api/v1/soccer/matches/upcoming` lists upcoming matches for today. Query parameter `league` may be used with one of the values from the previous endpoint
- `POST http://localhost:8080/api/v1/soccer/coupons/calculate` allows to calculate the odds for a coupon

Body of the coupon request should be like that:

```json
{
  "coupon": [
    {
      "matchId": "copy from upcoming endpoint",
      "bet": "home"
    },
    {
      "matchId": "copy from upcoming endpoint",
      "bet": "draw"
    },
    {
      "matchId": "copy from upcoming endpoint",
      "bet": "guest"
    }
  ]
}
```

## Development Setup

If you would like to go a bit deeper and see more debug messages, start the application in development mode:

- Copy .env.example and rename it to .env
- Set NODE_ENV=development
- Set domain part of POSTGRES_URL and REDIS_URL to localhost (localhost:5432 and localhost:6379)
- [ATTENTION!] you may need to adjust launch arguments for Puppeteer (src/services/soccer/soccerScraperService.ts)
- Run `docker compose up -d`
- Run `npm i -f`
- Run `npx prisma db push`
- Run `npm run dev`
