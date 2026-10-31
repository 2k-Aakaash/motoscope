type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): number {
  const configured = (process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "warn" : "info")) as Level;
  return order[configured] ?? order.info;
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!(error instanceof Error)) return error === undefined ? undefined : { value: String(error) };
  return { name: error.name, message: error.message, stack: error.stack };
}

/**
 * Structured JSON logs (one line per event) for the platform log collector.
 * Never pass personal data (emails, IPs, request bodies, query strings) as fields.
 */
function log(level: Level, message: string, fields: Record<string, unknown> = {}, error?: unknown) {
  if (order[level] < minLevel()) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...fields,
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => log("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>, error?: unknown) =>
    log("warn", message, fields, error),
  error: (message: string, fields?: Record<string, unknown>, error?: unknown) =>
    log("error", message, fields, error),
};
