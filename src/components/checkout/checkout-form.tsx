"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/storefront/providers";
import { INDIAN_STATES } from "@/lib/india";
import { formatInr } from "@/lib/money";

type FormValues = {
  fullName: string;
  mobile: string;
  email: string;
  addressLine: string;
  landmark: string;
  city: string;
  state: string;
  pinCode: string;
  notes: string;
  couponCode: string;
  accepted: boolean;
};

type Quote = { totals: { subtotalPaise: number; discountPaise: number; shippingCostPaise: number; taxPaise: number; totalPaise: number }; couponMessage: string; items: { name?: string; quantity: number; variantName?: string; available: boolean }[] };

export function CheckoutForm() {
  const store = useStore();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const form = useForm<FormValues>({ defaultValues: { state: "Maharashtra", email: "", landmark: "", notes: "", couponCode: "", accepted: false } });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (!data.customer) return;
        const current = form.getValues();
        form.reset({
          ...current,
          fullName: data.customer.name || current.fullName,
          mobile: data.customer.mobile || current.mobile,
          email: data.customer.email || current.email,
        });
      })
      .catch(() => undefined);
    // Prefill once when checkout loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const couponCode = form.watch("couponCode");
  const pinCode = form.watch("pinCode");

  useEffect(() => {
    if (store.cart.length === 0) return;
    const handle = window.setTimeout(async () => {
      const response = await fetch("/api/cart/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: store.cart, couponCode, pinCode: pinCode || "" }),
      });
      const data = await response.json();
      if (response.ok) setQuote(data);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [store.cart, couponCode, pinCode]);

  async function onSubmit(values: FormValues) {
    if (!values.accepted) {
      setError("Please accept the privacy policy and terms.");
      return;
    }
    setPending(true);
    setError("");
    const key = sessionStorage.getItem("velora_checkout_key") || crypto.randomUUID().replaceAll("-", "");
    sessionStorage.setItem("velora_checkout_key", key);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        items: store.cart,
        idempotencyKey: key,
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Unable to place the order.");
      if (data.fieldErrors) {
        for (const [field, messages] of Object.entries(data.fieldErrors as Record<string, string[]>)) {
          if (field in values) form.setError(field as keyof FormValues, { message: messages[0] });
        }
      }
      sessionStorage.removeItem("velora_checkout_key");
      return;
    }
    sessionStorage.removeItem("velora_checkout_key");
    store.clearCart();
    router.push(`/orders/${data.order.publicToken}`);
  }

  if (store.cart.length === 0) return <p>Your bag is empty. <Link className="underline" href="/collections/sarees">Continue shopping</Link>.</p>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]" noValidate>
      <div className="card grid gap-4 p-5">
        <h1 className="font-serif text-4xl">Checkout</h1>
        {(["fullName", "mobile", "email", "addressLine", "landmark", "city", "pinCode", "notes"] as const).map((name) => (
          <label key={name} className="grid gap-1 text-sm">
            {name === "fullName" ? "Full name" : name === "addressLine" ? "Address" : name === "pinCode" ? "PIN code" : name[0]!.toUpperCase() + name.slice(1)}
            <input className="field" {...form.register(name, { required: name !== "email" && name !== "landmark" && name !== "notes" })} />
            {form.formState.errors[name] ? <span className="text-primary">{form.formState.errors[name]?.message}</span> : null}
          </label>
        ))}
        <label className="grid gap-1 text-sm">State
          <select className="field" {...form.register("state", { required: true })}>
            {INDIAN_STATES.map((state) => <option key={state}>{state}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">Coupon
          <input className="field" {...form.register("couponCode")} />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" {...form.register("accepted")} />
          <span>I agree to the <Link className="underline" href="/policies/privacy">privacy policy</Link> and <Link className="underline" href="/policies/terms">terms</Link>.</span>
        </label>
        {error ? <p className="text-primary">{error}</p> : null}
        <button className="btn" disabled={pending} type="submit">{pending ? "Placing order…" : "Place order and view UPI instructions"}</button>
      </div>
      <aside className="card h-fit p-5">
        <h2 className="font-serif text-3xl">Order summary</h2>
        <ul className="mt-4 grid gap-2 text-sm">
          {quote?.items.map((item, index) => <li key={index}>{item.name} {item.variantName ? `· ${item.variantName}` : ""} × {item.quantity}</li>)}
        </ul>
        {quote ? (
          <dl className="mt-4 grid gap-2">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatInr(quote.totals.subtotalPaise)}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>{formatInr(quote.totals.discountPaise)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{formatInr(quote.totals.shippingCostPaise)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{formatInr(quote.totals.taxPaise)}</dd></div>
            <div className="flex justify-between text-lg"><dt>Payable</dt><dd>{formatInr(quote.totals.totalPaise)}</dd></div>
          </dl>
        ) : <p className="mt-4 text-muted">Calculating the current total…</p>}
        {quote?.couponMessage ? <p className="mt-2 text-sm text-primary">{quote.couponMessage}</p> : null}
        <p className="mt-4 text-xs text-muted">Guest checkout is available. Your mobile number creates or updates your account and signs you in after the order. Payment stays pending until the store verifies the UPI transfer.</p>
        <p className="text-xs text-muted"><Link className="underline" href="/login">Sign in</Link> or <Link className="underline" href="/register">register</Link> to prefill your details.</p>
      </aside>
    </form>
  );
}
