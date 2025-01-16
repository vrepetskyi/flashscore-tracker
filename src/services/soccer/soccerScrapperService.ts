// @ts-expect-error no types available
import { PuppeteerBlocker } from "@ghostery/adblocker-puppeteer";
import fetch from "cross-fetch";
import { parse } from "date-fns";
import puppeteer, { Browser } from "puppeteer";
import { env } from "../../utils.js";

// For the main page Puppetter was the only option, because there were no fetch requests sent and some leagues were collapsed.
// Used an ad blocker and handled cookies notification to make the scrapping easier.

// There was also an exposed GraphQL endpoint for odds, but I have decided not to use it, because it didn't provide complete information about the match.
// Merging already scrapped data with that GraphQL endpoint would be more difficult than scrapping everything once again.

// In order to avoid the IP address of our main server being blocked by Flashscore, we may want to:
// 1. Add a small random delay after each request
// 2. Deploy the scrapper service separately in the cloud, regularly rotating its IP address

// At the moment the whole scrapping process takes about a minute.
// In case the processes were to be longer, a more advanced scheduling tool like Apache Spark would be useful.

const MATCH_LIST_TIMEOUT = 3 * 1000;
const MATCH_DETAILS_TIMEOUT = 5 * 60 * 1000;

const browserConfiguration = {
  headless: true,
  ...(env.NODE_ENV === "development" && {
    // Needed for WSL
    executablePath: "/usr/bin/chromium-browser",
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

const scrapeMatchDetails = async (
  browser: Browser,
  blocker: any,
  matchId: string
) => {
  const page = await browser.newPage();
  await blocker.enableBlockingInPage(page);

  // TODO: record fetch time

  await page.goto(
    `https://www.flashscore.pl/mecz/${matchId}/#/zestawienie-kursow/kursy-1x2/koniec-meczu`,
    { timeout: MATCH_DETAILS_TIMEOUT }
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

  const odds = await page.$$eval("div.ui-table__row", (rows) =>
    rows.map((row) => {
      const bookmaker = (
        row.querySelector("a.prematchLink") as HTMLAnchorElement
      ).title;

      const [oddsHome, oddsDraw, oddsGuest] = [
        ...row.querySelectorAll("& > a span"),
      ].map((element) => Number((element as HTMLSpanElement).innerText));

      return { bookmaker, oddsHome, oddsDraw, oddsGuest };
    })
  );

  await page.close();

  return { date, league, home, guest, odds };
};

const scrapeFreshData = async () => {
  // Open the browser each time not to waste resources in between.
  console.info("Starting the scrapping...");
  const browser = await puppeteer.launch(browserConfiguration);
  const blocker = await PuppeteerBlocker.fromPrebuiltAdsAndTracking(fetch);

  const matchIds = await scrapeUpcomingMatchIds(browser, blocker);
  console.info("The upcoming matches have been scrapped");

  // Scrape all the match details in parallel.
  const allMatchDetails = await Promise.all(
    matchIds.map((matchId) => scrapeMatchDetails(browser, blocker, matchId))
  );
  console.info("All the match details have been scrapped");

  // TODO: insert into the database
};

await scrapeFreshData();

// TODO: scheduling
