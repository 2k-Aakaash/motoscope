export const Roles = { Admin: "Admin", Editor: "Editor", Moderator: "Moderator" } as const;
export type Role = (typeof Roles)[keyof typeof Roles];
export const allRoles: Role[] = [Roles.Admin, Roles.Editor, Roles.Moderator];

/** Authorization policies, enforced server-side on every protected route. */
export const Policies = {
  /** Admin only: user/role management, configuration. */
  RequireAdmin: [Roles.Admin],
  /** Catalogue, trends, sources, editorial content. */
  RequireEditor: [Roles.Admin, Roles.Editor],
  /** Owner reports and moderation. */
  RequireModerator: [Roles.Admin, Roles.Moderator],
} as const satisfies Record<string, readonly Role[]>;
export type Policy = keyof typeof Policies;

export function satisfies(userRoles: readonly string[], policy: Policy): boolean {
  return Policies[policy].some((role) => userRoles.includes(role));
}
