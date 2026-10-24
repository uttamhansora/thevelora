export const ORDER_STATUSES = ["awaiting_payment", "processing", "shipped", "delivered", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending", "claim_submitted", "paid", "rejected", "refunded"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ["cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["claim_submitted", "paid", "rejected"],
  claim_submitted: ["paid", "rejected", "pending"],
  rejected: ["claim_submitted", "paid"],
  paid: ["refunded"],
  refunded: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function isPaidStatus(status: PaymentStatus): boolean {
  return status === "paid";
}
