"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, useCsrf } from "@/components/admin/admin-shell";
import { slugify } from "@/lib/slug";

type ImageItem = { url: string; alt: string; publicId: string; width: number | null; height: number | null };
type VariantItem = { name: string; sku: string; priceOverride: string; stockQuantity: number; color: string };

const empty = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  categoryId: "",
  collectionIds: [] as string[],
  images: [] as ImageItem[],
  fabric: "",
  color: "",
  pattern: "",
  sareeLength: "",
  blousePiece: "",
  careInstructions: "",
  dimensions: "",
  variants: [] as VariantItem[],
  price: "",
  compareAt: "",
  cost: "",
  stockQuantity: 0,
  lowStockThreshold: 2,
  weightGrams: "",
  packageLengthCm: "",
  packageWidthCm: "",
  packageHeightCm: "",
  tags: "",
  isPublished: false,
  isFeatured: false,
  isBestSeller: false,
  seoTitle: "",
  seoDescription: "",
};

function rupeesToPaise(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function ProductForm({ productId }: { productId?: string }) {
  const csrfToken = useCsrf();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [slugEdited, setSlugEdited] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [collections, setCollections] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    adminFetch(csrfToken, "/api/admin/categories").then((data) => setCategories(data.items)).catch(() => undefined);
    adminFetch(csrfToken, "/api/admin/collections").then((data) => setCollections(data.items)).catch(() => undefined);
    if (!productId) return;
    adminFetch(csrfToken, `/api/admin/products/${productId}`).then((data) => {
      const product = data.product;
      setSlugEdited(true);
      setForm({
        ...empty,
        ...product,
        categoryId: product.categoryId || "",
        collectionIds: (product.collectionIds || []).map(String),
        price: (product.pricePaise / 100).toFixed(2),
        compareAt: product.compareAtPricePaise != null ? (product.compareAtPricePaise / 100).toFixed(2) : "",
        cost: product.costPricePaise != null ? (product.costPricePaise / 100).toFixed(2) : "",
        tags: (product.tags || []).join(", "),
        variants: (product.variants || []).map((variant: { name?: string; sku?: string; priceOverridePaise?: number | null; stockQuantity?: number; color?: string }) => ({
          name: variant.name || "",
          sku: variant.sku || "",
          priceOverride: variant.priceOverridePaise == null ? "" : (variant.priceOverridePaise / 100).toFixed(2),
          stockQuantity: variant.stockQuantity || 0,
          color: variant.color || "",
        })),
        weightGrams: product.weightGrams ?? "",
        packageLengthCm: product.packageLengthCm ?? "",
        packageWidthCm: product.packageWidthCm ?? "",
        packageHeightCm: product.packageHeightCm ?? "",
      });
    }).catch((error: Error) => setMessage(error.message));
  }, [csrfToken, productId]);

  function update(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    const data = await adminFetch(csrfToken, "/api/admin/uploads", { method: "POST", body });
    update({ images: [...form.images, { ...data.image, alt: form.name }] });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const next = [...form.images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    update({ images: next });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      sku: form.sku,
      shortDescription: form.shortDescription,
      description: form.description,
      categoryId: form.categoryId || null,
      collectionIds: form.collectionIds,
      images: form.images,
      fabric: form.fabric,
      color: form.color,
      pattern: form.pattern,
      sareeLength: form.sareeLength,
      blousePiece: form.blousePiece,
      careInstructions: form.careInstructions,
      dimensions: form.dimensions,
      variants: form.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku,
        priceOverridePaise: rupeesToPaise(variant.priceOverride),
        stockQuantity: Number(variant.stockQuantity),
        color: variant.color,
      })),
      pricePaise: rupeesToPaise(form.price) ?? -1,
      compareAtPricePaise: rupeesToPaise(form.compareAt),
      costPricePaise: rupeesToPaise(form.cost),
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
      weightGrams: form.weightGrams === "" ? null : Number(form.weightGrams),
      packageLengthCm: form.packageLengthCm === "" ? null : Number(form.packageLengthCm),
      packageWidthCm: form.packageWidthCm === "" ? null : Number(form.packageWidthCm),
      packageHeightCm: form.packageHeightCm === "" ? null : Number(form.packageHeightCm),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      isPublished: form.isPublished,
      isFeatured: form.isFeatured,
      isBestSeller: form.isBestSeller,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
    };
    try {
      const data = await adminFetch(csrfToken, productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setMessage(form.isPublished ? "Product published." : "Product saved.");
      if (!productId) router.push(`/admin/products/${data.product._id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the product.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-4">
      <label className="grid gap-1 text-sm">Product name<input className="field" value={form.name} onChange={(event) => update({ name: event.target.value, slug: slugEdited ? form.slug : slugify(event.target.value) })} required /></label>
      <label className="grid gap-1 text-sm">Slug<input className="field" value={form.slug} onChange={(event) => { setSlugEdited(true); update({ slug: event.target.value }); }} required /></label>
      <label className="grid gap-1 text-sm">SKU<input className="field" value={form.sku} onChange={(event) => update({ sku: event.target.value.toUpperCase() })} required /></label>
      <label className="grid gap-1 text-sm">Short description<textarea className="field" value={form.shortDescription} onChange={(event) => update({ shortDescription: event.target.value })} /></label>
      <label className="grid gap-1 text-sm">Description<textarea className="field min-h-32" value={form.description} onChange={(event) => update({ description: event.target.value })} /></label>
      <label className="grid gap-1 text-sm">Category
        <select className="field" value={form.categoryId} onChange={(event) => update({ categoryId: event.target.value })}>
          <option value="">None</option>
          {categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm">Collections</legend>
        {collections.map((item) => (
          <label key={item._id} className="flex gap-2 text-sm"><input type="checkbox" checked={form.collectionIds.includes(item._id)} onChange={(event) => update({ collectionIds: event.target.checked ? [...form.collectionIds, item._id] : form.collectionIds.filter((id) => id !== item._id) })} />{item.name}</label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Selling price INR<input className="field" value={form.price} onChange={(event) => update({ price: event.target.value })} required /></label>
        <label className="text-sm">Original price INR<input className="field" value={form.compareAt} onChange={(event) => update({ compareAt: event.target.value })} /></label>
        <label className="text-sm">Cost price INR<input className="field" value={form.cost} onChange={(event) => update({ cost: event.target.value })} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["fabric", "color", "pattern", "sareeLength", "blousePiece"] as const).map((field) => <label key={field} className="text-sm capitalize">{field}<input className="field" value={form[field]} onChange={(event) => update({ [field]: event.target.value })} /></label>)}
      </div>
      <label className="text-sm">Care instructions<textarea className="field" value={form.careInstructions} onChange={(event) => update({ careInstructions: event.target.value })} /></label>
      <label className="text-sm">Dimensions<input className="field" value={form.dimensions} onChange={(event) => update({ dimensions: event.target.value })} /></label>
      <label className="text-sm">Tags, comma separated<input className="field" value={form.tags} onChange={(event) => update({ tags: event.target.value })} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Stock<input className="field" type="number" value={form.stockQuantity} onChange={(event) => update({ stockQuantity: Number(event.target.value) })} /></label>
        <label className="text-sm">Low-stock threshold<input className="field" type="number" value={form.lowStockThreshold} onChange={(event) => update({ lowStockThreshold: Number(event.target.value) })} /></label>
        <label className="text-sm">Weight grams<input className="field" value={form.weightGrams} onChange={(event) => update({ weightGrams: event.target.value })} /></label>
      </div>
      <section>
        <h2 className="font-serif text-2xl">Images</h2>
        <input className="mt-2" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file).catch((error: Error) => setMessage(error.message)); }} />
        <div className="mt-3 grid gap-3">
          {form.images.map((image, index) => (
            <div key={image.url} className="flex items-center gap-3" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); moveImage(from, index - from > 0 ? 1 : -1); }}>
              <img src={image.url} alt={image.alt || ""} className="h-16 w-14 object-cover" />
              <input className="field" value={image.alt} aria-label="Alt text" onChange={(event) => update({ images: form.images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item) })} />
              <button type="button" onClick={() => moveImage(index, -1)}>Up</button>
              <button type="button" onClick={() => moveImage(index, 1)}>Down</button>
              <button type="button" onClick={() => update({ images: form.images.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Variants</h2><button className="btn btn-secondary" type="button" onClick={() => update({ variants: [...form.variants, { name: "", sku: "", priceOverride: "", stockQuantity: 0, color: "" }] })}>Add variant</button></div>
        {form.variants.map((variant, index) => (
          <div key={index} className="mt-3 grid gap-2 sm:grid-cols-5">
            <input className="field" placeholder="Name" value={variant.name} onChange={(event) => update({ variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} />
            <input className="field" placeholder="SKU" value={variant.sku} onChange={(event) => update({ variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value.toUpperCase() } : item) })} />
            <input className="field" inputMode="decimal" placeholder="Price ₹ or blank" aria-label="Variant price in rupees" value={variant.priceOverride} onChange={(event) => update({ variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, priceOverride: event.target.value } : item) })} />
            <input className="field" type="number" placeholder="Stock" value={variant.stockQuantity} onChange={(event) => update({ variants: form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, stockQuantity: Number(event.target.value) } : item) })} />
            <button type="button" onClick={() => update({ variants: form.variants.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
          </div>
        ))}
      </section>
      <label className="text-sm">SEO title<input className="field" value={form.seoTitle} onChange={(event) => update({ seoTitle: event.target.value })} /></label>
      <label className="text-sm">Meta description<textarea className="field" value={form.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={form.isPublished} onChange={(event) => update({ isPublished: event.target.checked })} /> Published</label>
      <label className="flex gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(event) => update({ isFeatured: event.target.checked })} /> Featured</label>
      <label className="flex gap-2"><input type="checkbox" checked={form.isBestSeller} onChange={(event) => update({ isBestSeller: event.target.checked })} /> Bestseller flag</label>
      {message ? <p>{message}</p> : null}
      <button className="btn" type="submit">Save product</button>
    </form>
  );
}
