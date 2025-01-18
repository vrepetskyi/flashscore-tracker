import prisma from "../../../prisma/client";
import { getOddsByBookmakerMatch } from "../soccerCouponsService";

jest.mock("../../../prisma/client", () => ({
  oddsSet: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
}));

describe("getOddsByBookmakerMatch", () => {
  it("Check if data structure transformation is performed correctly", async () => {
    const mockMatchIds = ["match1", "match2"];

    (prisma.oddsSet.groupBy as jest.Mock).mockResolvedValue([
      { matchId: "match1", bookmaker: "Bookmaker1", _max: { oddsSetId: 1 } },
      { matchId: "match2", bookmaker: "Bookmaker1", _max: { oddsSetId: 2 } },
      { matchId: "match1", bookmaker: "Bookmaker2", _max: { oddsSetId: 3 } },
    ]);

    (prisma.oddsSet.findMany as jest.Mock).mockResolvedValue([
      {
        bookmaker: "Bookmaker1",
        matchId: "match1",
        oddsHome: 1.5,
        oddsDraw: 2.0,
        oddsGuest: 3.0,
      },
      {
        bookmaker: "Bookmaker1",
        matchId: "match2",
        oddsHome: 1.7,
        oddsDraw: 2.1,
        oddsGuest: 3.1,
      },
      {
        bookmaker: "Bookmaker2",
        matchId: "match1",
        oddsHome: 1.6,
        oddsDraw: 2.2,
        oddsGuest: 3.2,
      },
    ]);

    const result = await getOddsByBookmakerMatch(mockMatchIds);

    expect(result).toEqual({
      Bookmaker1: {
        match1: { home: 1.5, draw: 2.0, guest: 3.0 },
        match2: { home: 1.7, draw: 2.1, guest: 3.1 },
      },
      Bookmaker2: {
        match1: { home: 1.6, draw: 2.2, guest: 3.2 },
      },
    });
  });

  it("Check if there is an error thrown if not common bookmaker is found", async () => {
    const mockMatchIds = ["match1", "match2"];

    (prisma.oddsSet.groupBy as jest.Mock).mockResolvedValue([
      { matchId: "match1", bookmaker: "Bookmaker1", _max: { oddsSetId: 1 } },
      { matchId: "match2", bookmaker: "Bookmaker2", _max: { oddsSetId: 2 } },
    ]);

    await expect(getOddsByBookmakerMatch(mockMatchIds)).rejects.toThrow();
  });
});
