import { z } from "zod";
import { AppError } from "../../middlewares/errorHandler.js";
import prisma from "../../prisma/client.js";
import { groupBy } from "../../utils.js";

const isMatchesValid = async (matchIds: string[]) => {
  const entries = await prisma.match.findMany({
    where: {
      matchId: { in: matchIds },
      date: { gte: new Date() },
    },
  });

  return entries.length === matchIds.length;
};

export const couponSchema = z
  .array(
    z.object({
      matchId: z.string().length(8),
      bet: z.enum(["home", "draw", "guest"]),
    })
  )
  .nonempty()
  .refine(
    async (coupon) =>
      await isMatchesValid(coupon.map(({ matchId }) => matchId)),
    {
      message:
        "All the matches should be upcoming today, have odds listed, and not be duplicated",
    }
  );

/**
 * @returns the latests odds sets from bookmakers that are common for all of the matches grouped by the bookmaker and matchId.
 */
const getOddsByBookmakerMatch = async (matchIds: string[]) => {
  const groups = await prisma.oddsSet.groupBy({
    by: ["matchId", "bookmaker"],
    where: { matchId: { in: matchIds } },
    _max: { oddsSetId: true },
  });

  const matchesByBookmaker = groups.reduce((acc, group) => {
    acc[group.bookmaker] ??= new Set();
    acc[group.bookmaker].add(group.matchId);
    return acc;
  }, {} as Record<string, Set<string>>);

  const commonBookmakers = Object.keys(matchesByBookmaker).filter(
    (bookmaker) => matchesByBookmaker[bookmaker].size === matchIds.length
  );

  if (commonBookmakers.length === 0) {
    throw new AppError(
      400,
      "There is no common bookmaker for the specified matches"
    );
  }

  const validOddsSetIds = groups
    .filter((group) => commonBookmakers.includes(group.bookmaker))
    .map((group) => group._max.oddsSetId!);

  const latest = await prisma.oddsSet.findMany({
    where: { oddsSetId: { in: validOddsSetIds } },
    select: {
      bookmaker: true,
      matchId: true,
      oddsHome: true,
      oddsDraw: true,
      oddsGuest: true,
    },
    orderBy: { bookmaker: "asc" },
  });

  const byBookmaker = groupBy(latest, "bookmaker");

  const byMatchId = Object.fromEntries(
    Object.entries(byBookmaker).map(([bookmaker, entries]) => [
      bookmaker,
      entries.reduce((acc, { matchId, oddsHome, oddsDraw, oddsGuest }) => {
        acc[matchId] = {
          home: oddsHome,
          draw: oddsDraw,
          guest: oddsGuest,
        };
        return acc;
      }, {} as Record<string, { home: number; draw: number; guest: number }>),
    ])
  );

  return byMatchId;
};

export const getCouponOddsByBookmaker = async (
  coupon: z.infer<typeof couponSchema>
) => {
  const matchIds = coupon.map(({ matchId }) => matchId);

  const structuredOdds = await getOddsByBookmakerMatch(matchIds);

  const calculatedOdds = Object.fromEntries(
    Object.entries(structuredOdds).map(([bookmaker, matches]) => [
      bookmaker,
      Math.round(
        coupon.reduce(
          (acc, { matchId, bet }) => acc * matches[matchId][bet],
          1
        ) * 1000
      ) / 1000,
    ])
  );

  return calculatedOdds;
};
