import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentPanel } from "@/components/orders/payment-panel";
import { getOrderByToken, paymentInstructionsFor, publicOrderView } from "@/services/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token).catch(() => null);
  if (!order) notFound();
  const instructions = order.paymentStatus === "paid" ? undefined : await paymentInstructionsFor(order);
  return <div className="mx-auto max-w-6xl px-4 py-10"><PaymentPanel initial={publicOrderView(order, instructions)} /></div>;
}
