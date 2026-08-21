import { describe, it, expect } from "vitest";
import { rateLimit } from "@/server/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit, then throws", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(() => rateLimit(key, 5, 60_000)).not.toThrow();
    }
    expect(() => rateLimit(key, 5, 60_000)).toThrow();
  });

  it("tracks separate keys independently", () => {
    const keyA = `test:a:${Math.random()}`;
    const keyB = `test:b:${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(keyA, 3, 60_000);
    expect(() => rateLimit(keyA, 3, 60_000)).toThrow();
    // keyB has its own independent bucket — unaffected by keyA being exhausted.
    expect(() => rateLimit(keyB, 3, 60_000)).not.toThrow();
  });

  it("resets after the window elapses", async () => {
    const key = `test:window:${Math.random()}`;
    rateLimit(key, 1, 50); // 1 request per 50ms
    expect(() => rateLimit(key, 1, 50)).toThrow();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(() => rateLimit(key, 1, 50)).not.toThrow();
  });
});
