"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch, useCsrf } from "@/components/admin/admin-shell";
import { formatInr } from "@/lib/money";

export function TaxonomyManager({ kind }: { kind: "categories" | "collections" }) {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<{ _id: string; name: string; slug: string; isPublished: boolean }>>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { adminFetch(csrf, `/api/admin/${kind}`).then((data) => setItems(data.items)).catch((error: Error) => setMessage(error.message)); }, [csrf, kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = await adminFetch(csrf, `/api/admin/${kind}`, {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        description: form.get("description") || "",
        imageUrl: form.get("imageUrl") || "",
        imageAlt: form.get("imageAlt") || "",
        sortOrder: Number(form.get("sortOrder") || 0),
        isPublished: form.get("isPublished") === "on",
        seoTitle: "",
        seoDescription: "",
      }),
    });
    setItems((current) => [data.item, ...current]);
    setMessage("Saved.");
    event.currentTarget.reset();
  }

  return (
    <div>
      <h1 className="font-serif text-4xl capitalize">{kind}</h1>
      <form onSubmit={(event) => onSubmit(event).catch((error: Error) => setMessage(error.message))} className="mt-4 grid max-w-xl gap-3">
        <input className="field" name="name" placeholder="Name" required />
        <input className="field" name="slug" placeholder="slug" required />
        <textarea className="field" name="description" placeholder="Description" />
        <input className="field" name="imageUrl" placeholder="Image URL" />
        <input className="field" name="imageAlt" placeholder="Image alt text" />
        <input className="field" name="sortOrder" type="number" defaultValue={0} />
        <label className="flex gap-2"><input name="isPublished" type="checkbox" /> Published</label>
        <button className="btn" type="submit">Save</button>
      </form>
      {message ? <p className="mt-3">{message}</p> : null}
      <ul className="mt-6 grid gap-2">{items.map((item) => <li key={item._id} className="flex items-center justify-between border-b border-border py-2"><span>{item.name} · {item.slug}</span><button type="button" onClick={() => adminFetch(csrf, `/api/admin/${kind}/${item._id}`, { method: "DELETE" }).then(() => setItems((current) => current.filter((entry) => entry._id !== item._id)))}>Archive</button></li>)}</ul>
    </div>
  );
}

export function OrdersManager() {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const data = await adminFetch(csrf, `/api/admin/orders?q=${encodeURIComponent(query)}`);
    setItems(data.items);
  }
  useEffect(() => {
    let ignore = false;
    adminFetch(csrf, `/api/admin/orders?q=${encodeURIComponent(query)}`)
      .then((data) => { if (!ignore) setItems(data.items); })
      .catch((error: Error) => { if (!ignore) setMessage(error.message); });
    return () => { ignore = true; };
  }, [csrf, query]);

  async function open(id: string) {
    const data = await adminFetch(csrf, `/api/admin/orders/${id}`);
    setSelected(data.order);
  }

  async function update(action: "verify" | "reject" | "processing" | "shipped" | "delivered" | "cancelled") {
    if (!selected?._id) return;
    const id = String(selected._id);
    if (action === "verify" || action === "reject") {
      const note = window.prompt("Note for the audit log") || "";
      await adminFetch(csrf, "/api/admin/payment-verification", { method: "POST", body: JSON.stringify({ orderId: id, action, note }) });
    } else {
      const courier = action === "shipped" ? window.prompt("Courier") || "" : undefined;
      const trackingNumber = action === "shipped" ? window.prompt("Tracking number") || "" : undefined;
      await adminFetch(csrf, `/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ orderStatus: action, courier, trackingNumber }) });
    }
    setMessage("Order updated.");
    await open(id);
    await load();
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Orders</h1>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); load().catch((error: Error) => setMessage(error.message)); }}><input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, name, mobile, or UTR" /><button className="btn">Search</button></form>
      {message ? <p className="mt-3">{message}</p> : null}
      <ul className="mt-4 grid gap-2">{items.map((item) => <li key={String(item._id)}><button type="button" className="underline" onClick={() => open(String(item._id))}>{String(item.orderNumber)} · {String(item.paymentStatus)} · {formatInr(Number(item.totalPaise))}</button></li>)}</ul>
      {selected ? (
        <article className="card mt-6 p-4">
          <h2 className="font-serif text-3xl">{String(selected.orderNumber)}</h2>
          <p>{String((selected.customer as { name?: string })?.name)} · {String((selected.customer as { mobile?: string })?.mobile)}</p>
          <p>{String((selected.shippingAddress as { addressLine?: string })?.addressLine)}, {String((selected.shippingAddress as { city?: string })?.city)} {String((selected.shippingAddress as { pinCode?: string })?.pinCode)}</p>
          <p>Payment {String(selected.paymentStatus)} · Order {String(selected.orderStatus)} · {formatInr(Number(selected.totalPaise))}</p>
          <ul className="mt-3 text-sm">{((selected.items as Array<{ name: string; quantity: number; sku: string }> ) || []).map((item) => <li key={item.sku}>{item.name} × {item.quantity}</li>)}</ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn" type="button" onClick={() => update("verify")}>Mark paid</button>
            <button className="btn btn-secondary" type="button" onClick={() => update("reject")}>Reject claim</button>
            <button className="btn btn-secondary" type="button" onClick={() => update("shipped")}>Mark shipped</button>
            <button className="btn btn-secondary" type="button" onClick={() => update("delivered")}>Mark delivered</button>
            <button className="btn btn-secondary" type="button" onClick={() => update("cancelled")}>Cancel</button>
            <a className="btn btn-secondary" href={`/admin/orders/${String(selected._id)}/invoice`}>Invoice</a>
          </div>
        </article>
      ) : null}
    </div>
  );
}

export function CouponsManager() {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<{ _id: string; code: string; isActive: boolean }>>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { adminFetch(csrf, "/api/admin/coupons").then((data) => setItems(data.items)).catch((error: Error) => setMessage(error.message)); }, [csrf]);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("discountType"));
    const data = await adminFetch(csrf, "/api/admin/coupons", { method: "POST", body: JSON.stringify({
      code: form.get("code"),
      discountType: type,
      discountValueBps: type === "percentage" ? Math.round(Number(form.get("value")) * 100) : 0,
      discountValuePaise: type === "fixed" ? Math.round(Number(form.get("value")) * 100) : 0,
      minimumOrderValuePaise: Math.round(Number(form.get("minimum") || 0) * 100),
      maximumDiscountPaise: null,
      startsAt: null,
      expiresAt: null,
      usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : null,
      isActive: true,
    }) });
    setItems((current) => [data.item, ...current]);
    setMessage("Coupon saved.");
  }
  return <div><h1 className="font-serif text-4xl">Coupons</h1><form onSubmit={(event) => onSubmit(event).catch((error: Error) => setMessage(error.message))} className="mt-4 grid max-w-xl gap-3"><input className="field" name="code" placeholder="CODE" required /><select className="field" name="discountType"><option value="percentage">Percentage</option><option value="fixed">Fixed INR</option></select><input className="field" name="value" placeholder="10 for 10% or rupees" required /><input className="field" name="minimum" placeholder="Minimum order INR" /><input className="field" name="usageLimit" placeholder="Usage limit" /><button className="btn" type="submit">Save coupon</button></form>{message ? <p className="mt-3">{message}</p> : null}<ul className="mt-4">{items.map((item) => <li key={item._id}>{item.code} · {item.isActive ? "Active" : "Inactive"}</li>)}</ul></div>;
}

export function CustomersManager() {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<{ _id: string; name: string; mobile: string; email: string; orderCount: number }>>([]);
  useEffect(() => { adminFetch(csrf, "/api/admin/customers").then((data) => setItems(data.items)).catch(() => undefined); }, [csrf]);
  return <div><h1 className="font-serif text-4xl">Customers</h1><ul className="mt-4 grid gap-2">{items.map((item) => <li key={item._id}>{item.name} · {item.mobile} · {item.email} · {item.orderCount} orders</li>)}</ul></div>;
}

export function InventoryManager() {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<{ _id: string; name: string; sku: string; stockQuantity: number; variants: Array<{ sku: string; stockQuantity: number }> }>>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { adminFetch(csrf, "/api/admin/inventory").then((data) => setItems(data.items)).catch((error: Error) => setMessage(error.message)); }, [csrf]);
  return <div><h1 className="font-serif text-4xl">Inventory</h1>{message ? <p>{message}</p> : null}<ul className="mt-4 grid gap-3">{items.map((item) => <li key={item._id} className="card p-3"><p>{item.name}</p>{item.variants.length === 0 ? <StockEditor csrf={csrf} productId={item._id} sku={item.sku} stock={item.stockQuantity} variantSku={null} /> : item.variants.map((variant) => <StockEditor key={variant.sku} csrf={csrf} productId={item._id} sku={variant.sku} stock={variant.stockQuantity} variantSku={variant.sku} />)}</li>)}</ul></div>;
}

function StockEditor({ csrf, productId, sku, stock, variantSku }: { csrf: string; productId: string; sku: string; stock: number; variantSku: string | null }) {
  const [value, setValue] = useState(stock);
  return <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); adminFetch(csrf, "/api/admin/inventory", { method: "POST", body: JSON.stringify({ productId, variantSku, stockQuantity: value }) }); }}><span className="text-sm">{sku}</span><input className="field" type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} /><button className="btn btn-secondary" type="submit">Update</button></form>;
}

export function ReviewsManager() {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<{ _id: string; name: string; rating: number; body: string; isPublished: boolean }>>([]);
  useEffect(() => { adminFetch(csrf, "/api/admin/reviews").then((data) => setItems(data.items)).catch(() => undefined); }, [csrf]);
  return <div><h1 className="font-serif text-4xl">Reviews</h1><ul className="mt-4 grid gap-3">{items.map((item) => <li key={item._id} className="card p-3"><p>{item.name} · {item.rating}/5 · {item.isPublished ? "Published" : "Hidden"}</p><p>{item.body}</p><button className="btn btn-secondary mt-2" type="button" onClick={() => adminFetch(csrf, "/api/admin/reviews", { method: "PATCH", body: JSON.stringify({ id: item._id, isPublished: !item.isPublished }) }).then(() => setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, isPublished: !entry.isPublished } : entry)))}>{item.isPublished ? "Unpublish" : "Publish"}</button></li>)}</ul></div>;
}

export function AuditManager() {
  const csrf = useCsrf();
  const [items, setItems] = useState<Array<{ _id: string; action: string; actorEmail: string; createdAt: string; entityType: string }>>([]);
  useEffect(() => { adminFetch(csrf, "/api/admin/audit-logs").then((data) => setItems(data.items)).catch(() => undefined); }, [csrf]);
  return <div><h1 className="font-serif text-4xl">Audit logs</h1><ul className="mt-4 grid gap-2 text-sm">{items.map((item) => <li key={item._id}>{new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {item.actorEmail || "system"} · {item.action} · {item.entityType}</li>)}</ul></div>;
}

export function ProfileManager() {
  const csrf = useCsrf();
  const [message, setMessage] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await adminFetch(csrf, "/api/admin/profile", { method: "POST", body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) });
    setMessage("Password updated. Other sessions were signed out.");
  }
  return <div><h1 className="font-serif text-4xl">Administrator profile</h1><form onSubmit={(event) => onSubmit(event).catch((error: Error) => setMessage(error.message))} className="mt-4 grid max-w-md gap-3"><input className="field" type="password" name="currentPassword" placeholder="Current password" required /><input className="field" type="password" name="newPassword" placeholder="New password, at least 12 characters" required minLength={12} /><button className="btn" type="submit">Change password</button></form>{message ? <p className="mt-3">{message}</p> : null}</div>;
}

export function SettingsManager({ section }: { section: "homepage" | "shipping" | "payment" | "store" }) {
  const csrf = useCsrf();
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState("");
  useEffect(() => {
    adminFetch(csrf, "/api/admin/settings").then((data) => {
      setSettings(data.settings);
      setImages(data.images?.message || "");
      if (section === "payment" && data.merchant?.source === "missing") setMessage("No merchant UPI ID is configured. Add one here or set MERCHANT_UPI_ID on the server. UPI checkout stays disabled until then.");
      if (section === "payment" && data.merchant?.source === "environment") setMessage("A merchant UPI ID is set in the server environment and overrides the value saved here.");
    }).catch((error: Error) => setMessage(error.message));
  }, [csrf, section]);
  if (!settings) return <p>Loading settings…</p>;
  const current = settings as {
    announcement: { enabled: boolean; text: string; href: string };
    hero: { title: string; subtitle: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string };
    shipping: { flatRatePaise: number; freeShippingThresholdPaise: number; deliveryNote: string };
    payment: { merchantUpiId: string; merchantName: string; instructions: string };
    contact: { email: string; phone: string; address: string };
    policies: { privacy: string; returns: string; terms: string };
    tax: { rateBps: number; pricesIncludeTax: boolean; note: string };
  };
  async function save(data: Record<string, unknown>) {
    await adminFetch(csrf, "/api/admin/settings", { method: "PUT", body: JSON.stringify({ section, data }) });
    setMessage("Settings saved.");
  }
  if (section === "homepage") {
    return <form className="grid max-w-2xl gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); save({ announcement: { enabled: form.get("enabled") === "on", text: form.get("text"), href: form.get("href") }, hero: { ...current.hero, title: form.get("title"), subtitle: form.get("subtitle"), primaryCtaLabel: form.get("primaryCtaLabel"), primaryCtaHref: form.get("primaryCtaHref"), secondaryCtaLabel: form.get("secondaryCtaLabel"), secondaryCtaHref: form.get("secondaryCtaHref") } }).catch((error: Error) => setMessage(error.message)); }}><h1 className="font-serif text-4xl">Homepage and banners</h1><label className="flex gap-2"><input name="enabled" type="checkbox" defaultChecked={current.announcement.enabled} /> Show announcement</label><input className="field" name="text" defaultValue={current.announcement.text} placeholder="Announcement" /><input className="field" name="href" defaultValue={current.announcement.href} placeholder="Announcement link" /><input className="field" name="title" defaultValue={current.hero.title} /><input className="field" name="subtitle" defaultValue={current.hero.subtitle} /><input className="field" name="primaryCtaLabel" defaultValue={current.hero.primaryCtaLabel} /><input className="field" name="primaryCtaHref" defaultValue={current.hero.primaryCtaHref} /><input className="field" name="secondaryCtaLabel" defaultValue={current.hero.secondaryCtaLabel} /><input className="field" name="secondaryCtaHref" defaultValue={current.hero.secondaryCtaHref} /><button className="btn" type="submit">Save</button>{message ? <p>{message}</p> : null}</form>;
  }
  if (section === "shipping") {
    return <form className="grid max-w-xl gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); save({ flatRatePaise: Math.round(Number(form.get("flat")) * 100), freeShippingThresholdPaise: Math.round(Number(form.get("threshold")) * 100), deliveryNote: form.get("note"), serviceablePinPrefixes: String(form.get("allow") || "").split(",").map((item) => item.trim()).filter(Boolean), blockedPinPrefixes: String(form.get("block") || "").split(",").map((item) => item.trim()).filter(Boolean) }).catch((error: Error) => setMessage(error.message)); }}><h1 className="font-serif text-4xl">Shipping settings</h1><input className="field" name="flat" defaultValue={(current.shipping.flatRatePaise / 100).toFixed(2)} /><input className="field" name="threshold" defaultValue={(current.shipping.freeShippingThresholdPaise / 100).toFixed(2)} /><textarea className="field" name="note" defaultValue={current.shipping.deliveryNote} /><input className="field" name="allow" placeholder="Serviceable PIN prefixes, comma separated" /><input className="field" name="block" placeholder="Blocked PIN prefixes" /><button className="btn" type="submit">Save</button>{message ? <p>{message}</p> : null}</form>;
  }
  if (section === "payment") {
    return <form className="grid max-w-xl gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); save({ merchantUpiId: form.get("merchantUpiId"), merchantName: form.get("merchantName"), instructions: form.get("instructions") }).catch((error: Error) => setMessage(error.message)); }}><h1 className="font-serif text-4xl">Payment settings</h1><p className="text-sm text-muted">{images}</p><input className="field" name="merchantUpiId" defaultValue={current.payment.merchantUpiId} placeholder="merchant@upi" /><input className="field" name="merchantName" defaultValue={current.payment.merchantName} /><textarea className="field min-h-28" name="instructions" defaultValue={current.payment.instructions} /><button className="btn" type="submit">Save</button>{message ? <p>{message}</p> : null}</form>;
  }
  return <form className="grid max-w-2xl gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); save({ contact: { email: form.get("email"), phone: form.get("phone"), address: form.get("address") }, social: { instagram: form.get("instagram"), facebook: form.get("facebook"), pinterest: form.get("pinterest") }, policies: { privacy: form.get("privacy"), returns: form.get("returns"), terms: form.get("terms") }, tax: { rateBps: Math.round(Number(form.get("tax") || 0) * 100), pricesIncludeTax: form.get("included") === "on", note: current.tax.note }, seo: { title: "THE VELORA", description: "Elegance Woven for You." } }).catch((error: Error) => setMessage(error.message)); }}><h1 className="font-serif text-4xl">Store settings</h1><input className="field" name="email" defaultValue={current.contact.email} placeholder="Email" /><input className="field" name="phone" defaultValue={current.contact.phone} placeholder="Phone" /><textarea className="field" name="address" defaultValue={current.contact.address} placeholder="Address" /><input className="field" name="instagram" placeholder="Instagram URL" /><input className="field" name="facebook" placeholder="Facebook URL" /><input className="field" name="pinterest" placeholder="Pinterest URL" /><textarea className="field min-h-28" name="privacy" defaultValue={current.policies.privacy} /><textarea className="field min-h-28" name="returns" defaultValue={current.policies.returns} /><textarea className="field min-h-28" name="terms" defaultValue={current.policies.terms} /><label className="text-sm">GST percent, if configured<input className="field" name="tax" defaultValue={(current.tax.rateBps / 100).toString()} /></label><label className="flex gap-2"><input name="included" type="checkbox" defaultChecked={current.tax.pricesIncludeTax} /> Prices include tax</label><p className="text-sm text-muted">Tax settings are store configuration, not a legal determination.</p><button className="btn" type="submit">Save</button>{message ? <p>{message}</p> : null}</form>;
}
