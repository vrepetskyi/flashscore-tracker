import prisma from "../../prisma/client.js";

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
  const count = await prisma.match.count({ where: { league } });
  return count > 0;
};

export const getUpcoming = async (league?: string) => {
  const matches = await prisma.match.findMany({
    where: { date: { gte: new Date() } },
    include: {
      oddsSets: {
        select: {
          bookmaker: true,
          oddsHome: true,
          oddsDraw: true,
          oddsGuest: true,
          scrapeAt: true,
        },
        orderBy: { scrapeAt: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  const withAggregatedBookmakers = matches.map(({ oddsSets, ...match }) => ({
    ...match,
    oddsHistoryByBookmaker: oddsSets.reduce(
      (acc, { bookmaker, ...oddsSet }) => {
        if (!(bookmaker in acc)) {
          acc[bookmaker] = [];
        }
        acc[bookmaker].push(oddsSet);
        return acc;
      },
      {} as Record<string, any[]>
    ),
  }));

  return withAggregatedBookmakers;
};
