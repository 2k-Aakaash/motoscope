import { eq, inArray } from "drizzle-orm";
import type { Database, Executor } from "@/lib/db";
import {
  dataSources,
  manufacturers,
  markets,
  modelImages,
  motorcycleModels,
  motorcycleVariants,
  sourceCitations,
  specificationDefinitions,
  variantPrices,
  variantSpecifications,
} from "@/lib/db/schema";
import type { AvailabilityStatus, PublicationStatus, VehicleCategory } from "@/lib/domain/catalogue/enums";
import { AbsOptions, FuelTypes, SpecKeys as K, Transmissions } from "@/lib/domain/catalogue/spec-keys";
import { newId, slugify } from "@/lib/utils/text";

export const DEMO_SOURCE_NAME = "MotoScope demo dataset";

type Specs = Record<string, number | string | boolean>;
const [Petrol, Electric] = FuelTypes;
const [Manual, , , SingleSpeed] = Transmissions;
const [AbsNone, SingleChannel, DualChannel, Cornering] = AbsOptions;

/**
 * Development-only demo catalogue built around FICTIONAL manufacturers. Every number is illustrative and flagged
 * is_demo / provenance Demo / price type Illustrative; the UI badges it as demo data. Real manufacturers are
 * deliberately not used: unverified specs attached to real products would mislead.
 */
export async function seedDemoData(
  database: Database,
  { reset }: { reset: boolean },
): Promise<"seeded" | "skipped"> {
  if (process.env.NODE_ENV === "production" || process.env.MOTOSCOPE_ENV === "production") {
    throw new Error("Demo data must never be seeded into a production environment.");
  }

  return database.transaction(async (tx) => {
    if (reset) {
      await deleteDemoData(tx);
    } else {
      const [existing] = await tx
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(eq(manufacturers.isDemo, true))
        .limit(1);
      if (existing) return "skipped";
    }

    const now = new Date();
    const stamps = { createdAt: now, updatedAt: now };
    const [market] = await tx.select().from(markets).where(eq(markets.code, "IN"));
    if (!market) throw new Error("Reference data missing: run `npm run db:migrate` first.");
    const defs = new Map((await tx.select().from(specificationDefinitions)).map((d) => [d.key, d.id]));

    const sourceId = newId();
    const citationId = newId();
    await tx.insert(dataSources).values({
      id: sourceId,
      name: DEMO_SOURCE_NAME,
      sourceType: "Demo",
      notes: "Fictional brands and illustrative values for local development and demos. Not real-world data.",
      ...stamps,
    });
    await tx.insert(sourceCitations).values({
      id: citationId,
      dataSourceId: sourceId,
      title: "Illustrative demo values — not real specifications or prices",
      retrievedAt: now,
      ...stamps,
    });

    const manufacturer = async (name: string, description: string) => {
      const id = newId();
      await tx.insert(manufacturers).values({
        id,
        name,
        slug: slugify(name),
        countryOfOrigin: "India",
        description,
        isDemo: true,
        ...stamps,
      });
      return { id, name };
    };

    const model = async (
      maker: { id: string; name: string },
      name: string,
      category: VehicleCategory,
      status: AvailabilityStatus,
      launchYear: number | null,
      summary: string,
      publication: PublicationStatus = "Published",
    ) => {
      const id = newId();
      await tx.insert(motorcycleModels).values({
        id,
        manufacturerId: maker.id,
        name,
        slug: slugify(`${maker.name.split(" ")[0]} ${name}`),
        category,
        availabilityStatus: status,
        launchYear,
        summary,
        publicationStatus: publication,
        publishedAt: publication === "Published" ? now : null,
        isDemo: true,
        ...stamps,
      });
      return { id, launchYear, variants: 0 };
    };

    const variant = async (
      parent: { id: string; launchYear: number | null; variants: number },
      name: string,
      price: number | null,
      specs: Specs,
      isBase = false,
    ) => {
      const id = newId();
      await tx.insert(motorcycleVariants).values({
        id,
        modelId: parent.id,
        name,
        slug: slugify(name),
        isBase,
        sortOrder: parent.variants++,
        modelYear: parent.launchYear,
        ...stamps,
      });
      await tx.insert(variantSpecifications).values(
        Object.entries(specs).map(([key, value]) => ({
          id: newId(),
          variantId: id,
          definitionId: defs.get(key)!,
          numericValue: typeof value === "number" ? value : null,
          textValue: typeof value === "string" ? value : null,
          booleanValue: typeof value === "boolean" ? value : null,
          provenance: "Demo" as const,
          sourceCitationId: citationId,
          ...stamps,
        })),
      );
      if (price !== null) {
        await tx.insert(variantPrices).values({
          id: newId(),
          variantId: id,
          marketId: market.id,
          priceType: "Illustrative",
          amount: price,
          currencyCode: market.currencyCode,
          effectiveFrom: now.toISOString().slice(0, 10),
          isCurrent: true,
          provenance: "Demo",
          sourceCitationId: citationId,
          ...stamps,
        });
      }
    };

    const arka = await manufacturer(
      "Arka Motors",
      "Fictional demo manufacturer of commuter and retro motorcycles.",
    );
    const kestrel = await manufacturer(
      "Kestrel Moto",
      "Fictional demo manufacturer of performance and adventure motorcycles.",
    );
    const vayu = await manufacturer("Vayu Electric", "Fictional demo manufacturer of electric two-wheelers.");

    const sprint = await model(
      arka,
      "Sprint 125",
      "Commuter",
      "Available",
      2023,
      "An efficient 125cc commuter with a simple air-cooled engine. (Demo record)",
    );
    const petrolCommuter: Specs = {
      [K.EngineType]: "Single-cylinder, 4-stroke",
      [K.DisplacementCc]: 124.6,
      [K.Cylinders]: 1,
      [K.Cooling]: "Air-cooled",
      [K.FuelType]: Petrol,
      [K.FuelSystem]: "Fuel injection",
      [K.MaxPowerKw]: 8.2,
      [K.MaxPowerRpm]: 7500,
      [K.MaxTorqueNm]: 10.8,
      [K.MaxTorqueRpm]: 6000,
      [K.Transmission]: Manual,
      [K.Gears]: 5,
      [K.SeatHeightMm]: 790,
      [K.KerbWeightKg]: 122,
      [K.GroundClearanceMm]: 165,
      [K.FuelTankL]: 11,
      [K.SuspensionFront]: "Telescopic fork",
      [K.SuspensionRear]: "Twin shock absorbers",
      [K.WheelType]: "Alloy",
      [K.TyreFront]: "80/100-17 tubeless",
      [K.TyreRear]: "100/80-17 tubeless",
      [K.InstrumentCluster]: "Semi-digital",
      [K.ClaimedMileageKmpl]: 60,
      [K.Headlamp]: "Halogen",
    };
    await variant(
      sprint,
      "Drum",
      92_000,
      { ...petrolCommuter, [K.BrakeFront]: "130 mm drum", [K.BrakeRear]: "130 mm drum", [K.Abs]: AbsNone },
      true,
    );
    await variant(sprint, "Disc", 98_500, {
      ...petrolCommuter,
      [K.BrakeFront]: "240 mm disc",
      [K.BrakeRear]: "130 mm drum",
      [K.Abs]: SingleChannel,
      [K.Connectivity]: true,
    });

    const heritage = await model(
      arka,
      "Heritage 350",
      "Retro",
      "Available",
      2022,
      "A retro-styled 350cc single with a relaxed riding position. (Demo record)",
    );
    const heritageSpecs: Specs = {
      [K.EngineType]: "Single-cylinder, 4-stroke, SOHC",
      [K.DisplacementCc]: 349,
      [K.Cylinders]: 1,
      [K.Cooling]: "Air-oil cooled",
      [K.FuelType]: Petrol,
      [K.FuelSystem]: "Fuel injection",
      [K.MaxPowerKw]: 14.9,
      [K.MaxPowerRpm]: 6100,
      [K.MaxTorqueNm]: 27,
      [K.MaxTorqueRpm]: 4000,
      [K.Transmission]: Manual,
      [K.Gears]: 5,
      [K.SeatHeightMm]: 805,
      [K.KerbWeightKg]: 192,
      [K.GroundClearanceMm]: 170,
      [K.WheelbaseMm]: 1390,
      [K.FuelTankL]: 13,
      [K.BrakeFront]: "300 mm disc",
      [K.BrakeRear]: "270 mm disc",
      [K.Abs]: DualChannel,
      [K.SuspensionFront]: "41 mm telescopic fork",
      [K.SuspensionRear]: "Twin shock absorbers, preload adjustable",
      [K.TyreFront]: "100/90-19",
      [K.TyreRear]: "120/80-18",
      [K.InstrumentCluster]: "Analogue with digital inset",
      [K.ClaimedMileageKmpl]: 35,
    };
    await variant(heritage, "Standard", 189_000, { ...heritageSpecs, [K.WheelType]: "Spoke" }, true);
    await variant(heritage, "Chrome", 206_000, {
      ...heritageSpecs,
      [K.WheelType]: "Alloy",
      [K.Headlamp]: "LED",
    });

    // Upcoming model: most values unknown on purpose — demonstrates null handling and "price not announced".
    const roadstar = await model(
      arka,
      "Roadstar 160",
      "Naked",
      "Upcoming",
      2026,
      "An upcoming 160cc street motorcycle. Specifications are not yet confirmed. (Demo record)",
    );
    await variant(
      roadstar,
      "Standard",
      null,
      { [K.DisplacementCc]: 162, [K.FuelType]: Petrol, [K.Transmission]: Manual },
      true,
    );

    const strix = await model(
      kestrel,
      "Strix 390",
      "Naked",
      "Available",
      2024,
      "A lightweight single-cylinder naked motorcycle tuned for city and weekend riding. (Demo record)",
    );
    const strixSpecs: Specs = {
      [K.EngineType]: "Single-cylinder, 4-stroke, DOHC",
      [K.DisplacementCc]: 373,
      [K.Cylinders]: 1,
      [K.Cooling]: "Liquid-cooled",
      [K.FuelType]: Petrol,
      [K.FuelSystem]: "Fuel injection",
      [K.MaxPowerKw]: 32,
      [K.MaxPowerRpm]: 9000,
      [K.MaxTorqueNm]: 39,
      [K.MaxTorqueRpm]: 7000,
      [K.TopSpeedKmh]: 167,
      [K.Transmission]: Manual,
      [K.Gears]: 6,
      [K.SeatHeightMm]: 820,
      [K.KerbWeightKg]: 172,
      [K.GroundClearanceMm]: 185,
      [K.WheelbaseMm]: 1357,
      [K.FuelTankL]: 15,
      [K.BrakeFront]: "320 mm disc, radial caliper",
      [K.BrakeRear]: "240 mm disc",
      [K.SuspensionFront]: "43 mm USD fork",
      [K.SuspensionRear]: "Monoshock, preload adjustable",
      [K.WheelType]: "Alloy",
      [K.TyreFront]: "110/70-17",
      [K.TyreRear]: "150/60-17",
      [K.InstrumentCluster]: "5-inch TFT",
      [K.Connectivity]: true,
      [K.Headlamp]: "LED",
      [K.ClaimedMileageKmpl]: 28,
    };
    await variant(
      strix,
      "Standard",
      310_000,
      { ...strixSpecs, [K.Abs]: DualChannel, [K.TractionControl]: false },
      true,
    );
    await variant(strix, "Track", 335_000, {
      ...strixSpecs,
      [K.Abs]: Cornering,
      [K.TractionControl]: true,
      [K.RideModes]: "Street, Rain, Track",
    });

    const trailhawk = await model(
      kestrel,
      "Trailhawk 450",
      "Adventure",
      "Available",
      2025,
      "A mid-capacity adventure tourer with long-travel suspension. (Demo record)",
    );
    const trailSpecs: Specs = {
      [K.EngineType]: "Single-cylinder, 4-stroke, DOHC",
      [K.DisplacementCc]: 451,
      [K.Cylinders]: 1,
      [K.Cooling]: "Liquid-cooled",
      [K.FuelType]: Petrol,
      [K.FuelSystem]: "Fuel injection",
      [K.MaxPowerKw]: 29.4,
      [K.MaxPowerRpm]: 8000,
      [K.MaxTorqueNm]: 40,
      [K.MaxTorqueRpm]: 5500,
      [K.Transmission]: Manual,
      [K.Gears]: 6,
      [K.KerbWeightKg]: 196,
      [K.GroundClearanceMm]: 230,
      [K.FuelTankL]: 17,
      [K.BrakeFront]: "320 mm disc",
      [K.BrakeRear]: "270 mm disc",
      [K.Abs]: DualChannel,
      [K.SuspensionFront]: "43 mm USD fork, 200 mm travel",
      [K.SuspensionRear]: "Linked monoshock, 200 mm travel",
      [K.WheelType]: "Tubeless spoke",
      [K.TyreFront]: "90/90-21",
      [K.TyreRear]: "140/80-17",
      [K.InstrumentCluster]: "4-inch TFT",
      [K.Connectivity]: true,
      [K.RideModes]: "Performance, Eco",
      [K.ClaimedMileageKmpl]: 30,
    };
    await variant(trailhawk, "Base", 295_000, { ...trailSpecs, [K.SeatHeightMm]: 835 }, true);
    await variant(trailhawk, "Rally", 315_000, { ...trailSpecs, [K.SeatHeightMm]: 860, [K.Headlamp]: "LED" });

    const vento = await model(
      kestrel,
      "Vento 250",
      "Sport",
      "Discontinued",
      2021,
      "A discontinued fully-faired 250cc sport motorcycle. (Demo record)",
    );
    await variant(
      vento,
      "Standard",
      null,
      {
        [K.EngineType]: "Single-cylinder, 4-stroke, DOHC",
        [K.DisplacementCc]: 249,
        [K.Cooling]: "Liquid-cooled",
        [K.FuelType]: Petrol,
        [K.MaxPowerKw]: 22,
        [K.MaxTorqueNm]: 23,
        [K.Transmission]: Manual,
        [K.Gears]: 6,
        [K.SeatHeightMm]: 810,
        [K.KerbWeightKg]: 158,
        [K.Abs]: DualChannel,
      },
      true,
    );

    // Draft: never visible publicly. Used to verify publication rules.
    const draft = await model(
      kestrel,
      "Strix 690 Prototype",
      "Naked",
      "Upcoming",
      null,
      "Unpublished draft record. (Demo record)",
      "Draft",
    );
    await variant(draft, "Standard", null, { [K.DisplacementCc]: 690 }, true);

    const pulse = await model(
      vayu,
      "Pulse",
      "Commuter",
      "Available",
      2024,
      "An electric commuter motorcycle with a removable battery. (Demo record)",
    );
    const pulseSpecs: Specs = {
      [K.EngineType]: "Hub-mounted BLDC motor",
      [K.FuelType]: Electric,
      [K.MaxPowerKw]: 7,
      [K.MaxTorqueNm]: 50,
      [K.TopSpeedKmh]: 85,
      [K.Transmission]: SingleSpeed,
      [K.SeatHeightMm]: 780,
      [K.BrakeFront]: "220 mm disc",
      [K.BrakeRear]: "130 mm drum",
      [K.Abs]: AbsNone,
      [K.SuspensionFront]: "Telescopic fork",
      [K.SuspensionRear]: "Monoshock",
      [K.WheelType]: "Alloy",
      [K.InstrumentCluster]: "Digital",
      [K.Connectivity]: true,
    };
    await variant(
      pulse,
      "Standard",
      135_000,
      {
        ...pulseSpecs,
        [K.KerbWeightKg]: 115,
        [K.BatteryKwh]: 3.97,
        [K.ClaimedRangeKm]: 151,
        [K.ChargingTimeH]: 5.5,
      },
      true,
    );
    await variant(pulse, "Pro", 155_000, {
      ...pulseSpecs,
      [K.KerbWeightKg]: 119,
      [K.BatteryKwh]: 4.5,
      [K.ClaimedRangeKm]: 175,
      [K.ChargingTimeH]: 6,
      [K.RideModes]: "Eco, City, Sport",
    });

    const bolt = await model(
      vayu,
      "Bolt S",
      "Naked",
      "Available",
      2025,
      "An electric street motorcycle with a mid-mounted motor and chain drive. (Demo record)",
    );
    await variant(
      bolt,
      "Standard",
      169_000,
      {
        [K.EngineType]: "Mid-mounted PMSM motor",
        [K.FuelType]: Electric,
        [K.MaxPowerKw]: 9,
        [K.MaxTorqueNm]: 55,
        [K.TopSpeedKmh]: 105,
        [K.Transmission]: SingleSpeed,
        [K.SeatHeightMm]: 795,
        [K.KerbWeightKg]: 136,
        [K.BrakeFront]: "260 mm disc",
        [K.BrakeRear]: "220 mm disc",
        [K.Abs]: SingleChannel,
        [K.BatteryKwh]: 4,
        [K.ClaimedRangeKm]: 120,
        [K.ChargingTimeH]: 4.5,
        [K.InstrumentCluster]: "5-inch TFT",
        [K.Connectivity]: true,
        [K.RideModes]: "Eco, Ride, Sport",
      },
      true,
    );

    return "seeded";
  });
}

/** Removes only demo rows (is_demo models/manufacturers and the demo data source). */
async function deleteDemoData(tx: Executor): Promise<void> {
  const demoModels = tx
    .select({ id: motorcycleModels.id })
    .from(motorcycleModels)
    .where(eq(motorcycleModels.isDemo, true));
  const demoVariants = tx
    .select({ id: motorcycleVariants.id })
    .from(motorcycleVariants)
    .where(inArray(motorcycleVariants.modelId, demoModels));

  await tx.delete(variantSpecifications).where(inArray(variantSpecifications.variantId, demoVariants));
  await tx.delete(variantPrices).where(inArray(variantPrices.variantId, demoVariants));
  await tx.delete(modelImages).where(inArray(modelImages.modelId, demoModels));
  await tx.delete(motorcycleVariants).where(inArray(motorcycleVariants.modelId, demoModels));
  await tx.delete(motorcycleModels).where(eq(motorcycleModels.isDemo, true));
  await tx.delete(manufacturers).where(eq(manufacturers.isDemo, true));
  const demoSource = tx
    .select({ id: dataSources.id })
    .from(dataSources)
    .where(eq(dataSources.name, DEMO_SOURCE_NAME));
  await tx.delete(sourceCitations).where(inArray(sourceCitations.dataSourceId, demoSource));
  await tx.delete(dataSources).where(eq(dataSources.name, DEMO_SOURCE_NAME));
}
