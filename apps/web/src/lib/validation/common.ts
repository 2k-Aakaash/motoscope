import { z } from "zod";
import { HttpError, ValidationError } from "@/lib/http/errors";
import { isHttpUrl, isPlainText, isValidSlug } from "@/lib/utils/text";

/** Case-insensitive enum parsing that returns the canonical member name (matches ASP.NET enum binding). */
export function ciEnum<T extends string>(values: readonly T[]) {
  return z.string().transform((value, ctx): T => {
    const match = values.find((v) => v.toLowerCase() === value.toLowerCase());
    if (!match) {
      ctx.addIssue({ code: "custom", message: `The value '${value}' is not valid.` });
      return z.NEVER;
    }
    return match;
  });
}

export const plainText = (max: number, label: string) =>
  z
    .string()
    .max(max, `'${label}' must be ${max} characters or fewer.`)
    .refine(isPlainText, "Contains invalid control characters.");

export const optionalPlainText = (max: number, label: string) => plainText(max, label).nullish();

export const optionalSlug = z
  .string()
  .nullish()
  .refine(
    (s) => s === null || s === undefined || isValidSlug(s),
    "Slug may contain only lowercase letters, digits and single hyphens (max 120 characters).",
  );

export const optionalHttpUrl = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .refine((u) => u === null || u === undefined || isHttpUrl(u), "Must be an absolute http(s) URL.");

/** "specs.0.numericValue" → "specs[0].numericValue" (the field-path style clients already handle). */
function issuePath(path: PropertyKey[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") return `${acc}[${segment}]`;
    const key = String(segment);
    return acc ? `${acc}.${key}` : key;
  }, "");
}

export function toValidationError(error: z.ZodError): ValidationError {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issuePath(issue.path) || "$";
    (errors[key] ??= []).push(issue.message);
  }
  return new ValidationError(errors);
}

export function parseOrThrow<S extends z.ZodType>(
  schema: S,
  input: unknown,
  { keyByParameter = false }: { keyByParameter?: boolean } = {},
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = toValidationError(result.error);
    if (!keyByParameter) throw error;
    // Query parameters: key errors by parameter name only ("category", not "category[0]").
    const byParameter: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(error.errors)) {
      (byParameter[key.replace(/\[\d+\]$/, "")] ??= []).push(...messages);
    }
    throw new ValidationError(byParameter);
  }
  return result.data;
}

/** Reads a JSON request body (415 for other content types, 400 for malformed JSON) and validates it. */
export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/([\w.+-]+\+)?json\b/i.test(contentType)) {
    throw new HttpError(415, "Unsupported Media Type", "Send the request body as application/json.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError({ $: ["The request body is not valid JSON."] });
  }
  return parseOrThrow(schema, body);
}

/** Builds a plain object from query parameters; keys listed in `lists` keep every repeated value. */
export function queryObject(
  params: URLSearchParams,
  lists: readonly string[],
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    out[key] = lists.includes(key) ? params.getAll(key) : (params.get(key) ?? "");
  }
  return out;
}

/** Optional numeric query parameter; `integer` mirrors .NET int binding (no decimals). */
export function queryNumber(integer = false) {
  return z
    .string()
    .optional()
    .transform((raw, ctx): number | undefined => {
      if (raw === undefined || raw.trim() === "") return undefined;
      const value = Number(raw);
      if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) {
        ctx.addIssue({ code: "custom", message: `The value '${raw}' is not valid.` });
        return z.NEVER;
      }
      return value;
    });
}
