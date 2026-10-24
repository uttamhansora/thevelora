import { formatInr } from "@/lib/money";
import { getDashboard } from "@/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();
  const cards = [
    ["Orders", String(data.stats.totalOrders)],
    ["Awaiting verification", String(data.stats.pendingVerification)],
    ["Paid orders", String(data.stats.paidOrders)],
    ["Verified revenue", formatInr(data.stats.paidRevenuePaise)],
    ["Pending payment value", formatInr(data.stats.pendingPaymentPaise)],
    ["Gross order value", formatInr(data.stats.grossPaise)],
    ["Cancelled", String(data.stats.cancelledOrders)],
    ["Refunded value", formatInr(data.stats.refundedPaise)],
    ["Products", String(data.productCount)],
    ["Low stock", String(data.lowStock)],
  ];
  return (
    <div>
      <h1 className="font-serif text-4xl">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">Revenue counts only orders whose payment status is paid. Pending UPI claims are not included.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => <article key={label} className="card p-4"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl">{value}</p></article>)}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-3xl">Recent orders</h2>
          <ul className="mt-3 grid gap-2 text-sm">{data.recentOrders.map((order) => <li key={String(order._id)}>{String(order.orderNumber)} · {String(order.paymentStatus)} · {formatInr(Number(order.totalPaise))}</li>)}</ul>
        </section>
        <section>
          <h2 className="font-serif text-3xl">Payment claims</h2>
          <ul className="mt-3 grid gap-2 text-sm">{data.recentClaims.map((order) => <li key={String(order._id)}>{String(order.orderNumber)} · {String(order.paymentReference || "No reference")}</li>)}</ul>
        </section>
      </div>
      <section className="mt-8">
        <h2 className="font-serif text-3xl">Best sellers from verified sales</h2>
        {data.bestSellers.length === 0 ? <p className="mt-3 text-muted">No paid orders yet.</p> : <ul className="mt-3 grid gap-2">{data.bestSellers.map((item) => <li key={String(item._id)}>{item.name} · {item.quantity} sold · {formatInr(item.revenuePaise)}</li>)}</ul>}
      </section>
    </div>
  );
}
