import { describe, expect, it } from "vitest";
import { calcProgress } from "@/lib/plans";

describe("calcProgress", () => {
  it("is 0% with no tasks", () => {
    expect(calcProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
  });
  it("is done / total", () => {
    expect(calcProgress([{ status: "Done" }, { status: "To Do" }, { status: "In Progress" }, { status: "Done" }]).percent).toBe(50);
  });
});
