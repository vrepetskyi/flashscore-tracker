import * as Sentry from "@sentry/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./handlers/index";
import errorHandler from "./middlewares/errorHandler";
import requestLogger from "./middlewares/requestLogger";
import { env } from "./utils";

// Scraper is being scheduled inside of respective service.
import "./services/soccer/soccerScraperService";

Sentry.init({ dsn: env.SENTRY_DSN });

const app = express();

// Secured the server from unwanted requests.
app.use(helmet());
app.use(cors({ origin: false }));

app.use(express.json({ strict: true }));
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);
// Prepared the endpoint architecture for versioning.
app.use("/api/v1", routes);
app.use(errorHandler);

const port = env.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
