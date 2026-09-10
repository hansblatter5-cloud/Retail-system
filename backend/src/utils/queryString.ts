// Express types req.query values as string | string[] | ParsedQs | ParsedQs[] | undefined,
// since a query string CAN repeat a key (?a=1&a=2). Our routes only ever expect a single
// value, so this coerces defensively: an array takes its first entry, anything else that
// isn't a plain string is dropped rather than risking a bad Prisma query.
export function queryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}
