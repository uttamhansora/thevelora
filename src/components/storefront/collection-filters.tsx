"use client";

import { useState } from "react";

type Props = {
  defaults: {
    q: string;
    min: string;
    max: string;
    color: string;
    fabric: string;
    availability: string;
    category: string;
    sort: string;
  };
  categories: { slug: string; name: string }[];
};

export function CollectionFilters({ defaults, categories }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-secondary w-full lg:hidden" onClick={() => setOpen(true)}>Filters</button>
      <div className={open ? "fixed inset-0 z-50 bg-text/40 lg:static lg:z-auto lg:block lg:bg-transparent" : "hidden lg:block"} onClick={() => setOpen(false)}>
        <form className="card ml-auto h-full w-[min(100%,22rem)] overflow-auto p-4 lg:ml-0 lg:h-fit lg:w-auto" method="get" onClick={(event) => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <h2 className="font-serif text-2xl">Filters</h2>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="grid gap-3">
            <label className="text-sm">Search<input className="field" name="q" defaultValue={defaults.q} /></label>
            <label className="text-sm">Minimum price (₹)<input className="field" name="min" inputMode="decimal" defaultValue={defaults.min} /></label>
            <label className="text-sm">Maximum price (₹)<input className="field" name="max" inputMode="decimal" defaultValue={defaults.max} /></label>
            <label className="text-sm">Colour<input className="field" name="color" defaultValue={defaults.color} /></label>
            <label className="text-sm">Fabric<input className="field" name="fabric" defaultValue={defaults.fabric} /></label>
            <label className="text-sm">Availability
              <select className="field" name="availability" defaultValue={defaults.availability}>
                <option value="">Any</option>
                <option value="in">In stock</option>
                <option value="out">Out of stock</option>
              </select>
            </label>
            {categories.length > 0 ? (
              <label className="text-sm">Category
                <select className="field" name="category" defaultValue={defaults.category}>
                  <option value="">Any</option>
                  {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="text-sm">Sort
              <select className="field" name="sort" defaultValue={defaults.sort || "newest"}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
                <option value="best_selling">Best selling</option>
              </select>
            </label>
            <button className="btn" type="submit">Apply</button>
          </div>
        </form>
      </div>
    </>
  );
}
