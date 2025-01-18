import prisma from "../../prisma/client";
import { groupBy } from "../../utils";

export const getLeagues = async () => {
  const entries = await prisma.match.groupBy({
    by: ["league"],
    orderBy: { league: "asc" },
  });
  return entries.map((entry) => entry.league);
};

export const isLeagueValid = async (league: string) => {
  if (league.trim() === "") {
    return false;
  }
  const count = await prisma.match.count({
    where: { league, date: { gte: new Date() } },
  });
  return count > 0;
};

export const getUpcoming = async (league?: string) => {
  const matches = await prisma.match.findMany({
    where: { league, date: { gte: new Date() } },
    include: {
      oddsSets: {
        select: {
          bookmaker: true,
          oddsHome: true,
          oddsDraw: true,
          oddsGuest: true,
          scrapeAt: true,
        },
        orderBy: [{ bookmaker: "asc" }, { scrapeAt: "asc" }],
      },
    },
    orderBy: { date: "asc" },
  });

  const withAggregatedBookmakers = matches.map(({ oddsSets, ...match }) => ({
    ...match,
    oddsHistoryByBookmaker: groupBy(oddsSets, "bookmaker"),
  }));

  return withAggregatedBookmakers;
};
