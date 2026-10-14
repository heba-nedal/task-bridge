export const STATUSES = ["To Do", "In Progress", "Done"] as const;
export const PRIORITIES = ["High", "Medium", "Low"] as const;
export type TaskStatus = (typeof STATUSES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];

export function calcProgress(tasks: { status: string }[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Done").length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}

export function toDeliverables(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}
