"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { adminFetch, useCsrf } from "@/components/admin/admin-shell";

type Row = { _id: string; name: string; sku: string; slug: string; isPublished: boolean; pricePaise: number };

export default function ProductsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const csrf = useCsrf();

  async function load(q = query) {
    const data = await adminFetch(csrf, `/api/admin/products?q=${encodeURIComponent(q)}`);
    setItems(data.items);
  }

  useEffect(() => {
    let ignore = false;
    adminFetch(csrf, "/api/admin/products")
      .then((data) => { if (!ignore) setItems(data.items); })
      .catch((error: Error) => { if (!ignore) setMessage(error.message); });
    return () => { ignore = true; };
  }, [csrf]);

  async function bulk(action: "publish" | "unpublish" | "archive") {
    await adminFetch(csrf, "/api/admin/products/bulk", { method: "POST", body: JSON.stringify({ ids: selected, action }) });
    setMessage(`${action} complete.`);
    await load();
  }

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    const data = await adminFetch(csrf, "/api/admin/products/import", { method: "POST", body });
    setMessage(`Imported ${data.created}. Errors: ${data.errors.length}.`);
    await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">Products</h1>
        <Link className="btn" href="/admin/products/new">Add product</Link>
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); load().catch((error: Error) => setMessage(error.message)); }}>
        <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or SKU" />
        <button className="btn" type="submit">Search</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-secondary" type="button" onClick={() => bulk("publish")}>Publish</button>
        <button className="btn btn-secondary" type="button" onClick={() => bulk("unpublish")}>Unpublish</button>
        <button className="btn btn-secondary" type="button" onClick={() => bulk("archive")}>Archive</button>
        <button className="btn btn-secondary" type="button" onClick={() => { window.location.assign("/api/admin/products/export"); }}>Export CSV</button>
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(event) => importCsv(event).catch((error: Error) => setMessage(error.message))}>
        <input type="file" name="file" accept=".csv,text/csv" required />
        <button className="btn btn-secondary" type="submit">Import CSV</button>
      </form>
      {message ? <p className="mt-3">{message}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th></th><th>Name</th><th>SKU</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className="border-t border-border">
                <td><input type="checkbox" checked={selected.includes(item._id)} onChange={(event) => setSelected(event.target.checked ? [...selected, item._id] : selected.filter((id) => id !== item._id))} aria-label={`Select ${item.name}`} /></td>
                <td className="py-2">{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.isPublished ? "Published" : "Draft"}</td>
                <td className="flex gap-3 py-2"><Link href={`/admin/products/${item._id}`}>Edit</Link><Link href={`/products/${item.slug}?preview=1`}>Preview</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
