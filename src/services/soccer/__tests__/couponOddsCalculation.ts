import {
  getCouponOddsByBookmaker,
  getOddsByBookmakerMatch,
} from "../soccerCouponsService";

jest.mock("../soccerCouponsService", () => ({
  ...jest.requireActual("../soccerCouponsService"),
  getOddsByBookmakerMatch: jest.fn(),
}));

describe("getCouponOddsByBookmaker", () => {
  it("Do not accept empty coupons", async () => {
    const mockCoupon: any[] = [];
    (getOddsByBookmakerMatch as jest.Mock).mockResolvedValue({});
    await expect(getCouponOddsByBookmaker(mockCoupon as any)).rejects.toThrow();
  });
});
