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
