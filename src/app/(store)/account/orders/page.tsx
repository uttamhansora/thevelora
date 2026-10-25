import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/storefront/account-nav";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { formatInr } from "@/lib/money";
import { listOrdersForCustomer } from "@/services/orders";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

function labelPayment(status: string): string {
  switch (status) {
    case "paid": return "Paid";
    case "claim_submitted": return "Payment review";
    case "rejected": return "Payment rejected";
    case "refunded": return "Refunded";
    default: return "Awaiting payment";
  }
}

function labelOrder(status: string): string {
  switch (status) {
    case "awaiting_payment": return "Awaiting payment";
    case "processing": return "Processing";
    case "shipped": return "Shipped";
    case "delivered": return "Delivered";
    case "cancelled": return "Cancelled";
    default: return status.replaceAll("_", " ");
  }
}

export default async function AccountOrdersPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/login?next=/account/orders");

  const orders = await listOrdersForCustomer(customer.mobile);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <AccountNav current="orders" />
      <h1 className="font-serif text-4xl">My orders</h1>
      <p className="mt-2 text-sm text-muted">Orders placed with mobile {customer.mobile}.</p>
      {orders.length === 0 ? (
        <div className="card mt-6 p-5 text-sm text-muted">
          <p>No orders yet.</p>
          <Link className="btn btn-secondary mt-4 inline-flex" href="/collections/sarees">Browse sarees</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {orders.map((order) => (
            <li key={order.publicToken}>
              <Link href={`/orders/${order.publicToken}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <p className="font-serif text-xl">{formatInr(order.totalPaise)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-rose/40 px-2.5 py-1">{labelPayment(order.paymentStatus)}</span>
                  <span className="rounded-full bg-background px-2.5 py-1 border border-border">{labelOrder(order.orderStatus)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
