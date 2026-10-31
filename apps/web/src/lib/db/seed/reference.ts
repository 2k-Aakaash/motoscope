import { eq } from "drizzle-orm";
import { allRoles } from "@/lib/auth/roles";
import type { Database } from "@/lib/db";
import { markets, roles, specificationDefinitions } from "@/lib/db/schema";
import type { SpecGroup, SpecValueType } from "@/lib/domain/catalogue/enums";
import { AbsOptions, FuelTypes, SpecKeys as K, Transmissions } from "@/lib/domain/catalogue/spec-keys";
import { newId } from "@/lib/utils/text";

interface Def {
  key: string;
  label: string;
  group: SpecGroup;
  type: SpecValueType;
  unit?: string;
  filterable?: boolean;
  allowed?: readonly string[];
}

const definitions: Def[] = [
  { key: K.EngineType, label: "Engine type", group: "Engine", type: "Text" },
  {
    key: K.DisplacementCc,
    label: "Displacement",
    group: "Engine",
    type: "Number",
    unit: "cc",
    filterable: true,
  },
  { key: K.Cylinders, label: "Cylinders", group: "Engine", type: "Integer" },
  { key: K.Cooling, label: "Cooling", group: "Engine", type: "Text" },
  {
    key: K.FuelType,
    label: "Fuel type",
    group: "Engine",
    type: "Enum",
    filterable: true,
    allowed: FuelTypes,
  },
  { key: K.FuelSystem, label: "Fuel system", group: "Engine", type: "Text" },
  { key: K.MaxPowerKw, label: "Max power", group: "Performance", type: "Number", unit: "kW" },
  { key: K.MaxPowerRpm, label: "Max power at", group: "Performance", type: "Integer", unit: "rpm" },
  { key: K.MaxTorqueNm, label: "Max torque", group: "Performance", type: "Number", unit: "Nm" },
  { key: K.MaxTorqueRpm, label: "Max torque at", group: "Performance", type: "Integer", unit: "rpm" },
  { key: K.TopSpeedKmh, label: "Top speed", group: "Performance", type: "Number", unit: "km/h" },
  {
    key: K.Transmission,
    label: "Transmission",
    group: "Transmission",
    type: "Enum",
    filterable: true,
    allowed: Transmissions,
  },
  { key: K.Gears, label: "Gears", group: "Transmission", type: "Integer" },
  {
    key: K.SeatHeightMm,
    label: "Seat height",
    group: "Dimensions",
    type: "Number",
    unit: "mm",
    filterable: true,
  },
  {
    key: K.KerbWeightKg,
    label: "Kerb weight",
    group: "Dimensions",
    type: "Number",
    unit: "kg",
    filterable: true,
  },
  { key: K.GroundClearanceMm, label: "Ground clearance", group: "Dimensions", type: "Number", unit: "mm" },
  { key: K.WheelbaseMm, label: "Wheelbase", group: "Dimensions", type: "Number", unit: "mm" },
  { key: K.FuelTankL, label: "Fuel tank capacity", group: "Dimensions", type: "Number", unit: "L" },
  { key: K.BrakeFront, label: "Front brake", group: "Brakes", type: "Text" },
  { key: K.BrakeRear, label: "Rear brake", group: "Brakes", type: "Text" },
  { key: K.Abs, label: "ABS", group: "Brakes", type: "Enum", filterable: true, allowed: AbsOptions },
  { key: K.SuspensionFront, label: "Front suspension", group: "Suspension", type: "Text" },
  { key: K.SuspensionRear, label: "Rear suspension", group: "Suspension", type: "Text" },
  { key: K.WheelType, label: "Wheel type", group: "WheelsAndTyres", type: "Text" },
  { key: K.TyreFront, label: "Front tyre", group: "WheelsAndTyres", type: "Text" },
  { key: K.TyreRear, label: "Rear tyre", group: "WheelsAndTyres", type: "Text" },
  { key: K.InstrumentCluster, label: "Instrument cluster", group: "Features", type: "Text" },
  { key: K.Connectivity, label: "Bluetooth connectivity", group: "Features", type: "Boolean" },
  { key: K.RideModes, label: "Ride modes", group: "Features", type: "Text" },
  { key: K.TractionControl, label: "Traction control", group: "Features", type: "Boolean" },
  { key: K.Headlamp, label: "Headlamp", group: "Features", type: "Text" },
  { key: K.ClaimedMileageKmpl, label: "Claimed mileage", group: "Economy", type: "Number", unit: "km/l" },
  { key: K.ClaimedRangeKm, label: "Claimed range", group: "Battery", type: "Number", unit: "km" },
  { key: K.BatteryKwh, label: "Battery capacity", group: "Battery", type: "Number", unit: "kWh" },
  { key: K.ChargingTimeH, label: "Charging time (0–100%)", group: "Battery", type: "Number", unit: "h" },
];

/**
 * Idempotent reference data required in every environment (markets, roles, specification definitions).
 * Existing rows are updated in place, never duplicated. Runs after every `db:migrate`.
 */
export async function seedReferenceData(database: Database, now = new Date()): Promise<void> {
  await database.transaction(async (tx) => {
    const [india] = await tx.select({ id: markets.id }).from(markets).where(eq(markets.code, "IN"));
    if (!india) {
      await tx.insert(markets).values({
        id: newId(),
        code: "IN",
        name: "India",
        currencyCode: "INR",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const [i, d] of definitions.entries()) {
      const values = {
        label: d.label,
        group: d.group,
        valueType: d.type,
        unit: d.unit ?? null,
        isFilterable: d.filterable ?? false,
        allowedValues: [...(d.allowed ?? [])],
        sortOrder: (i + 1) * 10,
        updatedAt: now,
      };
      await tx
        .insert(specificationDefinitions)
        .values({ id: newId(), key: d.key, createdAt: now, ...values })
        .onConflictDoUpdate({ target: specificationDefinitions.key, set: values });
    }

    for (const role of allRoles) {
      const [existing] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.normalizedName, role.toUpperCase()));
      if (!existing) {
        await tx.insert(roles).values({
          id: newId(),
          name: role,
          normalizedName: role.toUpperCase(),
          concurrencyStamp: crypto.randomUUID(),
        });
      }
    }
  });
}
