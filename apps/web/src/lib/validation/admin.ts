import { z } from "zod";
import { availabilityStatuses, publicationStatuses, vehicleCategories } from "@/lib/domain/catalogue/enums";
import {
  ciEnum,
  optionalHttpUrl,
  optionalPlainText,
  optionalSlug,
  parseOrThrow,
  plainText,
  queryNumber,
} from "./common";

const version = z.number().int().nonnegative().nullish();

export const manufacturerUpsertSchema = z.object({
  name: plainText(100, "Name").refine((v) => v.trim().length > 0, "'Name' must not be empty."),
  slug: optionalSlug,
  countryOfOrigin: optionalPlainText(100, "Country Of Origin"),
  websiteUrl: optionalHttpUrl(500),
  description: optionalPlainText(4000, "Description"),
  /** Required on update: the version last read (optimistic concurrency). */
  version,
});
export type ManufacturerUpsert = z.output<typeof manufacturerUpsertSchema>;

export const motorcycleUpsertSchema = z.object({
  manufacturerId: z.uuid("'Manufacturer Id' must be a valid identifier."),
  name: plainText(120, "Name").refine((v) => v.trim().length > 0, "'Name' must not be empty."),
  slug: optionalSlug,
  category: ciEnum(vehicleCategories),
  availabilityStatus: ciEnum(availabilityStatuses),
  launchYear: z
    .number()
    .int()
    .min(1900, "'Launch Year' must be between 1900 and 2100.")
    .max(2100, "'Launch Year' must be between 1900 and 2100.")
    .nullish(),
  summary: optionalPlainText(500, "Summary"),
  description: optionalPlainText(8000, "Description"),
  publicationStatus: ciEnum(publicationStatuses)
    .refine((s) => s !== "Archived", "Use DELETE to archive a model.")
    .default("Draft"),
  version,
});
export type MotorcycleUpsert = z.output<typeof motorcycleUpsertSchema>;

export const adminListSchema = z
  .object({
    q: z.string().max(100, "'Text' must be 100 characters or fewer.").optional(),
    includeArchived: z
      .enum(["true", "false", "True", "False"], "The value is not valid.")
      .optional()
      .transform((v) => v?.toLowerCase() === "true"),
    page: queryNumber(true).transform((p) => p ?? 1),
    pageSize: queryNumber(true).transform((p) => p ?? 25),
    sort: z
      .string()
      .optional()
      .refine((s) => s === undefined || s === "name" || s === "updated", "Sort must be 'name' or 'updated'."),
  })
  .superRefine((q, ctx) => {
    if (q.page < 1 || q.page > 10_000)
      ctx.addIssue({
        code: "custom",
        path: ["page"],
        message: `'Page' must be between 1 and 10000. You entered ${q.page}.`,
      });
    if (q.pageSize < 1 || q.pageSize > 100)
      ctx.addIssue({
        code: "custom",
        path: ["pageSize"],
        message: `'Page Size' must be between 1 and 100. You entered ${q.pageSize}.`,
      });
  });
export type AdminListQuery = z.output<typeof adminListSchema>;

export function parseAdminList(params: URLSearchParams): AdminListQuery {
  return parseOrThrow(adminListSchema, Object.fromEntries(params));
}

export const idSchema = z.uuid();
