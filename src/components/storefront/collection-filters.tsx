"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const PRICE_FLOOR = 0;
const PRICE_CEILING = 100_000;
const PRICE_STEP = 500;

type Props = {
  defaults: {
    q: string;
    min: string;
    max: string;
    fabric: string;
    availability: string;
    category: string;
    sort: string;
  };
  categories: { slug: string; name: string }[];
};

function parsePrice(value: string, fallback: number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, Math.round(amount)));
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function snapPrice(raw: number): number {
  const clamped = Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, raw));
  return Math.round(clamped / PRICE_STEP) * PRICE_STEP;
}

function PriceRangeFields({ defaultMin, defaultMax }: { defaultMin: string; defaultMax: string }) {
  const initialMin = defaultMin ? parsePrice(defaultMin, PRICE_FLOOR) : PRICE_FLOOR;
  const initialMax = defaultMax ? parsePrice(defaultMax, PRICE_CEILING) : PRICE_CEILING;
  const [minValue, setMinValue] = useState(initialMin);
  const [maxValue, setMaxValue] = useState(Math.max(initialMin, initialMax));
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"min" | "max" | null>(null);
  const valuesRef = useRef({ min: initialMin, max: Math.max(initialMin, initialMax) });
  valuesRef.current = { min: minValue, max: maxValue };

  const submitMin = minValue > PRICE_FLOOR ? String(minValue) : "";
  const submitMax = maxValue < PRICE_CEILING ? String(maxValue) : "";
  const span = PRICE_CEILING - PRICE_FLOOR;
  const minPercent = ((minValue - PRICE_FLOOR) / span) * 100;
  const maxPercent = ((maxValue - PRICE_FLOOR) / span) * 100;

  const valueFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return PRICE_FLOOR;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return PRICE_FLOOR;
    const ratio = (clientX - rect.left) / rect.width;
    return snapPrice(PRICE_FLOOR + ratio * span);
  }, [span]);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const handle = dragRef.current;
    if (!handle) return;
    const next = valueFromClientX(event.clientX);
    const { min, max } = valuesRef.current;
    if (handle === "min") {
      const value = Math.min(next, max);
      valuesRef.current.min = value;
      setMinValue(value);
    } else {
      const value = Math.max(next, min);
      valuesRef.current.max = value;
      setMaxValue(value);
    }
  }, [valueFromClientX]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  const startDrag = (handle: "min" | "max") => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragRef.current = handle;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  return (
    <fieldset className="grid gap-2 border-0 p-0">
      <legend className="flex w-full items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">Price range</span>
        <span className="text-muted">{formatInr(minValue)} – {formatInr(maxValue)}</span>
      </legend>
      <div ref={trackRef} className="relative h-7 w-full touch-none select-none" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        <button
          type="button"
          aria-label="Minimum price"
          className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-primary shadow active:cursor-grabbing"
          style={{ left: `${minPercent}%` }}
          onPointerDown={startDrag("min")}
        />
        <button
          type="button"
          aria-label="Maximum price"
          className="absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-primary shadow active:cursor-grabbing"
          style={{ left: `${maxPercent}%` }}
          onPointerDown={startDrag("max")}
        />
      </div>
      <input type="hidden" name="min" value={submitMin} />
      <input type="hidden" name="max" value={submitMax} />
    </fieldset>
  );
}

export function CollectionFilters({ defaults, categories }: Props) {
  const [open, setOpen] = useState(false);
  const panelClass = useMemo(
    () => (open ? "fixed inset-0 z-50 bg-text/40 lg:static lg:z-auto lg:block lg:bg-transparent" : "hidden lg:block"),
    [open],
  );

  return (
    <>
      <button type="button" className="btn btn-secondary w-full lg:hidden" onClick={() => setOpen(true)}>Filters</button>
      <div className={panelClass} onClick={() => setOpen(false)}>
        <form
          className="card ml-auto flex h-full max-h-[100dvh] w-[min(100%,22rem)] flex-col overflow-auto p-4 lg:ml-0 lg:max-h-[calc(100dvh-7rem)] lg:w-auto lg:overflow-visible"
          method="get"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <h2 className="font-serif text-2xl">Filters</h2>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="grid flex-1 gap-3">
            {categories.length > 0 ? (
              <label className="text-sm">
                Category
                <select className="field" name="category" defaultValue={defaults.category}>
                  <option value="">Any</option>
                  {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="text-sm">
              Fabric
              <input className="field" name="fabric" defaultValue={defaults.fabric} />
            </label>
            <label className="text-sm">
              Availability
              <select className="field" name="availability" defaultValue={defaults.availability}>
                <option value="">Any</option>
                <option value="in">In stock</option>
                <option value="out">Out of stock</option>
              </select>
            </label>
            <label className="text-sm">
              Sort
              <select className="field" name="sort" defaultValue={defaults.sort || "newest"}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
                <option value="best_selling">Best selling</option>
              </select>
            </label>
            <PriceRangeFields defaultMin={defaults.min} defaultMax={defaults.max} />
            <label className="text-sm">
              Search
              <input className="field" name="q" defaultValue={defaults.q} placeholder="Name or SKU" />
            </label>
            <button className="btn mt-1" type="submit">Apply</button>
          </div>
        </form>
      </div>
    </>
  );
}
