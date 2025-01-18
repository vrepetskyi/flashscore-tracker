import { PuppeteerBlocker } from "@ghostery/adblocker-puppeteer";
import * as Sentry from "@sentry/node";
import fetch from "cross-fetch";
import { parse } from "date-fns";
import cron from "node-cron";
import puppeteer, { Browser } from "puppeteer";
import { z } from "zod";
import prisma from "../../prisma/client.js";
import { env, logger } from "../../utils.js";

// For scraping a tool like Puppetter was the only option, because the rendering on Flashscore is done by JS and there are no fetch requests being sent.
// There was also an exposed GraphQL endpoint for odds, but I have decided not to use it, because it didn't provide complete information about the match.
// Merging already scraped data with that GraphQL endpoint would be more difficult (and therefore resulting in more potential failure points) than scraping everything once again.

// In addition, I have used an ad blocker and handled cookies notifications to make the scraping more robust.
// Currently, for time efficiency all the matches are being scraped in parallel with a limit of tabs.

// Depending on the time of the day and the number of upcoming matches scraping takes up to 10 minutes,
// but in case the process was to be longer, a more advanced ETL tool like Apache Spark would be useful.

// In order to avoid the IP address of our main server being blocked by Flashscore, we may want to:
// 1. Add a small random delay after each request
// 2. Deploy the scraper service separately in the cloud, regularly rotating its IP address

const MATCH_LIST_TIMEOUT = 3 * 1000;

const browserConfiguration = {
  headless: true,
  ...(env.NODE_ENV === "development"
    ? {
        // Needed for WSL
        executablePath: "/usr/bin/chromium-browser",
      }
    : {
        headless: true,
        defaultViewport: null,
        executablePath: "/usr/bin/google-chrome",
        args: ["--no-sandbox"],
      }),
};

const scrapeUpcomingMatchIds = async (browser: Browser, blocker: any) => {
  const page = await browser.newPage();
  await blocker.enableBlockingInPage(page);

  await page.goto("https://www.flashscore.pl/");
  await page.locator("#onetrust-accept-btn-handler").click();
  await page.locator(".filters__tab::-p-text(Następne)").click();

  while (true) {
    try {
      await page
        .locator("[data-testid*='navigation-arrow-down']")
        .setTimeout(MATCH_LIST_TIMEOUT)
        .click();
    } catch {
      break;
    }
  }

  const matchLinks = await page.$$eval(
    "a[href*='szczegoly-meczu']",
    (anchors) => anchors.map((anchor) => anchor.href)
  );

  await page.close();

  const matchIds = matchLinks.map(
    (link) =>
      link
        .split("https://www.flashscore.pl/mecz/")[1]
        .split("/#/szczegoly-meczu")[0]
  );

  return matchIds;
};

const matchScraperSchema = z.object({
  matchId: z.string(),
  date: z.date(),
  league: z.string(),
  home: z.string(),
  guest: z.string(),
  oddsSets: z
    .array(
      z.object({
        bookmaker: z.string(),
        oddsHome: z.number(),
        oddsDraw: z.number(),
        oddsGuest: z.number(),
      })
    )
    .nonempty(),
  scrapeAt: z.date(),
});

const scrapeMatch = async (browser: Browser, blocker: any, matchId: string) => {
  const page = await browser.newPage();
  await blocker.enableBlockingInPage(page);

  const scrapeAt = new Date();
  await page.goto(
    `https://www.flashscore.pl/mecz/${matchId}/#/zestawienie-kursow/kursy-1x2/koniec-meczu`
  );

  const rawDate = await page.$eval(
    ".duelParticipant__startTime div",
    (element) => element.innerText
  );
  const date = parse(rawDate, "dd.MM.yyyy HH:mm", new Date());

  const league = await page.$eval(".tournamentHeader__country a", (element) => {
    const parts = element.innerText.split(" - ");
    parts.length > 1 && parts.pop();
    return parts.join(" - ");
  });

  const home = await page.$eval(
    ".duelParticipant__home a.participant__participantName",
    (element) => element.innerText
  );

  const guest = await page.$eval(
    ".duelParticipant__away a.participant__participantName",
    (element) => element.innerText
  );

  const oddsSets = await page.$$eval("div.ui-table__row", (rows) =>
    rows.map((row) => {
      const bookmaker = (
        row.querySelector("a.prematchLink") as HTMLAnchorElement
      ).title;

      const [oddsHome, oddsDraw, oddsGuest] = [
        ...row.querySelectorAll("& > a span"),
      ].map((element) => Number((element as HTMLSpanElement).innerText));

      return {
        bookmaker,
        oddsHome,
        oddsDraw,
        oddsGuest,
      };
    })
  );

  await page.close();

  const match = {
    matchId,
    date,
    league,
    home,
    guest,
    oddsSets,
    scrapeAt,
  };

  return matchScraperSchema.parse(match);
};

type Matches = Awaited<ReturnType<typeof scrapeMatch>>[];

// Perform upsert in case some details of the match e.g. date have changed.

const upsertMatches = async (matches: Matches) => {
  const operations = [
    prisma.match.updateMany({ data: { isUpToDate: false } }),

    ...matches.map(({ matchId, oddsSets, scrapeAt, ...rest }) =>
      prisma.match.upsert({
        where: { matchId },

        update: {
          ...rest,
          lastScrapeAt: scrapeAt,
          oddsSets: {
            create: oddsSets.map((oddsSet) => ({ ...oddsSet, scrapeAt })),
          },
          isUpToDate: true,
        },

        create: {
          matchId,
          ...rest,
          firstScrapeAt: scrapeAt,
          lastScrapeAt: scrapeAt,
          oddsSets: {
            create: oddsSets.map((oddsSet) => ({ ...oddsSet, scrapeAt })),
          },
        },
      })
    ),
  ];

  await prisma.$transaction(operations);
};

const scrapeFreshData = async () => {
  // Open the browser each time not to waste resources in between.
  logger.info("Starting scraper...");
  const browser = await puppeteer.launch(browserConfiguration);
  const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);

  logger.info("1/3 Scraping upcoming matchIds...");
  const matchIds = await scrapeUpcomingMatchIds(browser, blocker);
  logger.info("1/3 Upcoming matchIds scraped.");

  logger.info("2/3 Scraping matches...");
  const matches: Matches = [];
  let queue: Promise<any>[] = [];

  // Scrape the matches in parallel, with respect to the limit of tabs.
  for (const matchId of matchIds) {
    logger.debug(`Scraping ${matchId}...`);
    const scrapingPromise = scrapeMatch(browser, blocker, matchId)
      .then((match) => {
        matches.push(match);
      })
      .catch((err) => {
        logger.debug(err);
      })
      .finally(() => {
        // Free space in the queue after completion.
        queue.splice(queue.indexOf(scrapingPromise), 1);
      });

    // Populate the queue until the limit is reached.
    queue.push(scrapingPromise);

    // Wait until there is space in the queue.
    if (queue.length >= Number(env.SCRAPING_MAX_TABS)) {
      await Promise.race(queue);
    }
  }

  // Wait until the queue is empty.
  await Promise.all(queue);
  logger.info("2/3 Matches scraped.");

  await browser.close();

  // Upsert all the matches in one DB request.
  logger.info("3/3 Upserting matches...");
  await upsertMatches(matches);
  logger.info("3/3 Matches upserted.");

  // Optionally cleanup matches that have already started.
  if (env.SCRAPING_CLEANUP_STARTED === "true") {
    await prisma.match.deleteMany({ where: { date: { lt: new Date() } } });
  }
};

const runScrapeTask = async () => {
  try {
    await scrapeFreshData();
  } catch (err: any) {
    logger.error(`${err?.message}: ${err?.stack}`);
    Sentry.captureException(err);
  }
};

// Run scraping without blocking the main thread.
(async function initializeScraping() {
  if (env.SCRAPING_ON_START === "true") {
    await runScrapeTask();
  }
  cron.schedule(`*/${env.SCRAPING_INTERVAL_MINUTES} * * * *`, runScrapeTask);
})();
