import cors from "cors";
import express from "express";
import helmet from "helmet";
import errorHandler from "./middlewares/errorHandler";
import requestLogger from "./middlewares/requestLogger";
import routes from "./routes";
import "./services/soccer/soccerScrapperService";
import { env } from "./utils";

const app = express();

app.use(helmet());
app.use(cors({ origin: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);
app.use("/api/v1", routes);
app.use(errorHandler);

const port = env.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
