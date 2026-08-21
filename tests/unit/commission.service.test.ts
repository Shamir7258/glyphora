import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { CommissionService } from "@/server/services/commission.service";
import { CommissionConfigModel } from "@/server/models/commission-config.model";

// mongodb-memory-server can't spin up its own mongod binary in this sandbox
// (process spawn is restricted) — tests/setup/db.ts connects to a dedicated
// `glyphora_test` database on the real local mongod instead, dropped clean
// before/after each test file. See docs/DEVELOPMENT.md "Testing strategy".
import { connectTestDB, disconnectTestDB } from "../setup/db";

beforeAll(connectTestDB);

afterEach(async () => {
  await CommissionConfigModel.deleteMany({});
});

afterAll(disconnectTestDB);

describe("CommissionService.splitAmount", () => {
  it("splits a gross amount using the given percentage, rounding the platform fee", () => {
    const split = CommissionService.splitAmount(2000, 30); // $20.00 at 30%
    expect(split.platformFeeCents).toBe(600);
    expect(split.designerShareCents).toBe(1400);
    expect(split.platformFeeCents + split.designerShareCents).toBe(2000);
  });

  it("never loses or gains a cent to rounding on odd amounts", () => {
    for (const gross of [1, 3, 7, 999, 12345]) {
      for (const pct of [0, 1, 12.5, 30, 33.33, 100]) {
        const split = CommissionService.splitAmount(gross, pct);
        expect(split.platformFeeCents + split.designerShareCents).toBe(gross);
      }
    }
  });

  it("gives the designer everything at 0% and nothing at 100%", () => {
    expect(CommissionService.splitAmount(5000, 0)).toMatchObject({ designerShareCents: 5000, platformFeeCents: 0 });
    expect(CommissionService.splitAmount(5000, 100)).toMatchObject({ designerShareCents: 0, platformFeeCents: 5000 });
  });
});

describe("CommissionService versioning", () => {
  const adminId = new mongoose.Types.ObjectId().toString();

  it("falls back to the env default when no config exists", async () => {
    const pct = await CommissionService.getEffectivePercentage();
    expect(pct).toBe(Number(process.env.DEFAULT_COMMISSION_PERCENTAGE ?? 30));
  });

  it("uses the most recent config effective at or before the given time", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-06-01T00:00:00Z");
    await CommissionConfigModel.create({ percentage: 30, effectiveFrom: t0, createdBy: adminId });
    await CommissionConfigModel.create({ percentage: 25, effectiveFrom: t1, createdBy: adminId });

    expect(await CommissionService.getEffectivePercentage(new Date("2026-03-01T00:00:00Z"))).toBe(30);
    expect(await CommissionService.getEffectivePercentage(new Date("2026-12-01T00:00:00Z"))).toBe(25);
    expect(await CommissionService.getEffectivePercentage(new Date("2025-01-01T00:00:00Z"))).toBe(
      Number(process.env.DEFAULT_COMMISSION_PERCENTAGE ?? 30)
    );
  });

  it("never mutates an existing config row — createConfig always appends", async () => {
    await CommissionService.createConfig(30, adminId, "initial");
    await CommissionService.createConfig(20, adminId, "lowered");

    const history = await CommissionService.history();
    expect(history).toHaveLength(2);
    expect(history[0].percentage).toBe(20); // most recent first
    expect(history[1].percentage).toBe(30);
  });

  it("rejects an out-of-range percentage", async () => {
    await expect(CommissionService.createConfig(-5, adminId)).rejects.toThrow();
    await expect(CommissionService.createConfig(101, adminId)).rejects.toThrow();
  });
});
