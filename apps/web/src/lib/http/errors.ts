/** Thrown by services when a resource does not exist (or is not visible). Mapped to 404. */
export class NotFoundError extends Error {
  constructor(resource: string, key: string) {
    super(`${resource} '${key}' was not found.`);
    this.name = "NotFoundError";
  }
}

/** Duplicate slug/name, stale version, or an operation blocked by dependants. Mapped to 409. */
export class ConflictError extends Error {
  constructor(
    message: string,
    readonly title = "Conflict",
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

/** Request validation failure. Mapped to 400 with field errors keyed by camelCase path. */
export class ValidationError extends Error {
  constructor(readonly errors: Record<string, string[]>) {
    super("One or more validation errors occurred.");
    this.name = "ValidationError";
  }
}

/** Generic HTTP error with a status code and title (401, 403, 415, 429…). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(title);
    this.name = "HttpError";
  }
}

export const CONCURRENCY_CONFLICT = new ConflictError(
  "The record was changed by someone else. Reload it and apply your changes again.",
  "Concurrent update",
);

/** PostgreSQL unique_violation — the pre-check passed for two concurrent writers. */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
