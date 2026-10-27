export const USER_ROLES = Object.freeze([
  "admin",
  "manufacturer",
  "supplier",
  "warehouse_manager",
  "logistics_provider"
]);

export const PUBLIC_REGISTRATION_ROLES = Object.freeze(
  USER_ROLES.filter((role) => role !== "admin")
);
