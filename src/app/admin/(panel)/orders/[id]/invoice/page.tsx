import { notFound } from "next/navigation";
import { formatInr } from "@/lib/money";
import { connectDB } from "@/lib/db/mongoose";
import { OrderModel } from "@/models/order";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const order = await OrderModel.findById(id).lean<{
    orderNumber: string;
    customer: { name: string; mobile: string; email: string };
    shippingAddress: { addressLine: string; city: string; state: string; pinCode: string };
    items: { name: string; sku: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
    subtotalPaise: number;
    discountPaise: number;
    shippingCostPaise: number;
    taxPaise: number;
    totalPaise: number;
    paymentStatus: string;
    orderStatus: string;
  } | null>();
  if (!order) notFound();
  return (
    <article className="mx-auto max-w-3xl bg-white p-8">
      <h1 className="font-serif text-4xl">THE VELORA</h1>
      <p>Order summary {order.orderNumber}</p>
      <p className="mt-4">{order.customer.name}<br />{order.customer.mobile}<br />{order.shippingAddress.addressLine}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pinCode}</p>
      <table className="mt-6 w-full text-left text-sm"><tbody>{order.items.map((item) => <tr key={item.sku}><td>{item.name}</td><td>{item.quantity}</td><td>{formatInr(item.lineTotalPaise)}</td></tr>)}</tbody></table>
      <p className="mt-4">Total {formatInr(order.totalPaise)} · Payment {order.paymentStatus} · Fulfilment {order.orderStatus}</p>
      <p className="mt-6 text-sm">This summary is for store records. It is not a tax invoice unless the configured tax settings say otherwise.</p>
    </article>
  );
}
