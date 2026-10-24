"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const image = images[active];
  if (!image) return <div className="flex aspect-[3/4] items-center justify-center rounded-3xl bg-rose/40 font-serif text-6xl text-primary">V</div>;
  return (
    <div>
      <button type="button" className="block aspect-[3/4] w-full overflow-hidden rounded-3xl bg-rose/30" onClick={() => setZoom((value) => !value)} aria-label={zoom ? "Close zoom" : "Zoom image"}>
        <img src={image.url} alt={image.alt || name} className={`h-full w-full object-cover ${zoom ? "scale-150" : ""}`} />
      </button>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.map((item, index) => (
            <button key={item.url} type="button" className={`h-16 w-14 overflow-hidden rounded-lg border ${index === active ? "border-primary" : "border-border"}`} onClick={() => setActive(index)}>
              <img src={item.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
