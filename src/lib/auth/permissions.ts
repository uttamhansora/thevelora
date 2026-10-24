export const ROLES = ["super_admin", "product_manager", "order_manager"] as const;
export type AdminRole = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.read",
  "products.write",
  "categories.write",
  "collections.write",
  "uploads.write",
  "inventory.write",
  "reviews.moderate",
  "homepage.write",
  "orders.write",
  "payments.verify",
  "customers.read",
  "coupons.write",
  "shipping.write",
  "settings.write",
  "audit.read",
  "profile.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[] | "*"> = {
  super_admin: "*",
  product_manager: [
    "dashboard.read",
    "products.write",
    "categories.write",
    "collections.write",
    "uploads.write",
    "inventory.write",
    "reviews.moderate",
    "homepage.write",
    "profile.write",
  ],
  order_manager: [
    "dashboard.read",
    "orders.write",
    "payments.verify",
    "customers.read",
    "coupons.write",
    "shipping.write",
    "profile.write",
  ],
};

export function isAdminRole(value: string): value is AdminRole {
  return (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role];
  if (granted === "*") return true;
  return granted.includes(permission);
}
