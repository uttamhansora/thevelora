"use client";

import { FormEvent, useState } from "react";
import { formatInr } from "@/lib/money";
import { OrderStatusBadge } from "@/components/shared/states";

type OrderView = {
  orderNumber: string;
  publicToken: string;
  paymentStatus: string;
  orderStatus: string;
  totalPaise: number;
  items: { name: string; quantity: number; variantName: string; lineTotalPaise: number }[];
  paymentReference?: string;
  fulfillment: { courier: string; trackingNumber: string };
  instructions: null | {
    configured: boolean;
    upiUri: string | null;
    merchantVpa: string | null;
    merchantName: string | null;
    amount: string | null;
    transactionReference: string;
    message: string;
    qrDataUrl: string | null;
  };
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function PaymentPanel({ initial }: { initial: OrderView }) {
  const [order, setOrder] = useState(initial);
  const [message, setMessage] = useState("");
  const [utr, setUtr] = useState("");
  const [note, setNote] = useState("");

  async function payWithGooglePay() {
    const instructions = order.instructions;
    if (!instructions?.upiUri || !instructions.merchantVpa || !instructions.amount) return;
    const method = {
      supportedMethods: "https://tez.google.com/pay",
      data: {
        pa: instructions.merchantVpa,
        pn: instructions.merchantName,
        tr: instructions.transactionReference,
        tn: `Order ${order.orderNumber}`,
        am: instructions.amount,
        cu: "INR",
      },
    };
    try {
      if (typeof PaymentRequest === "undefined") {
        window.location.href = instructions.upiUri;
        return;
      }
      const request = new PaymentRequest([method], { total: { label: "THE VELORA", amount: { currency: "INR", value: instructions.amount } } });
      const canPay = await request.canMakePayment();
      if (!canPay) {
        window.location.href = instructions.upiUri;
        return;
      }
      await request.show();
      setMessage("If the UPI app completed the transfer, submit the UTR below. This screen does not confirm receipt.");
    } catch {
      setMessage("The payment request was closed. You can use the UPI link, QR code, or copy the merchant ID.");
    }
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("publicToken", order.publicToken);
    form.set("utr", utr);
    form.set("note", note);
    const response = await fetch("/api/payment-claims", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Unable to submit the reference.");
      return;
    }
    setOrder({ ...order, paymentStatus: data.order.paymentStatus, paymentReference: data.order.paymentReference });
    setMessage("Reference submitted. The order stays awaiting verification until an administrator checks the merchant account.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="card p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Order {order.orderNumber}</p>
        <h1 className="mt-2 font-serif text-4xl">Payment instructions</h1>
        <div className="mt-4 flex gap-2">
          <OrderStatusBadge status={order.orderStatus} />
          <OrderStatusBadge status={order.paymentStatus} />
        </div>
        <p className="mt-4 text-muted">{order.instructions?.message || "Payment instructions are attached to this order."}</p>
        {order.paymentStatus !== "paid" && order.instructions?.configured && order.instructions.upiUri ? (
          <div className="mt-6 grid gap-3">
            <p className="text-2xl">{formatInr(order.totalPaise)}</p>
            <p>UPI ID: {order.instructions.merchantVpa}</p>
            <div className="flex flex-wrap gap-2">
              <a className="btn" href={order.instructions.upiUri}>Open UPI app</a>
              <button className="btn btn-secondary" type="button" onClick={payWithGooglePay}>Google Pay</button>
              <button className="btn btn-secondary" type="button" onClick={() => copyText(order.instructions?.merchantVpa || "")}>Copy UPI ID</button>
              <button className="btn btn-secondary" type="button" onClick={() => copyText(order.instructions?.amount || "")}>Copy amount</button>
            </div>
            {order.instructions.qrDataUrl ? <img src={order.instructions.qrDataUrl} alt="UPI payment QR code" className="h-56 w-56" /> : null}
            <form onSubmit={submitClaim} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">UTR or reference<input className="field" value={utr} onChange={(event) => setUtr(event.target.value)} required minLength={6} /></label>
              <label className="grid gap-1 text-sm">Note<input className="field" value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <label className="grid gap-1 text-sm">Receipt image, optional<input className="field" type="file" name="receipt" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
              <button className="btn" type="submit">Submit payment reference</button>
            </form>
          </div>
        ) : null}
        {order.paymentStatus !== "paid" && order.instructions && !order.instructions.configured ? <p className="mt-4">UPI checkout is waiting for a merchant UPI ID in the store settings.</p> : null}
        {order.paymentStatus === "paid" ? <p className="mt-4">Payment has been verified by the store.</p> : <p className="mt-4 text-sm text-muted">A redirect or screenshot is not treated as a successful payment.</p>}
        {message ? <p className="mt-3">{message}</p> : null}
        {order.fulfillment.trackingNumber ? <p className="mt-3">Tracking: {order.fulfillment.courier} {order.fulfillment.trackingNumber}</p> : null}
      </section>
      <aside className="card p-6">
        <h2 className="font-serif text-3xl">Items</h2>
        <ul className="mt-4 grid gap-3">
          {order.items.map((item) => <li key={`${item.name}-${item.variantName}`} className="flex justify-between gap-3"><span>{item.name} {item.variantName ? `· ${item.variantName}` : ""} × {item.quantity}</span><span>{formatInr(item.lineTotalPaise)}</span></li>)}
        </ul>
      </aside>
    </div>
  );
}
