"use client";

import { useCallback, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";

const LENS_SIZE = 148;
const ZOOM_LEVEL = 2.4;

type GalleryImage = { url: string; alt: string };

function MagnifierImage({ image, name, onOpen }: { image: GalleryImage; name: string; onOpen: () => void }) {
  const [lens, setLens] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const updateLens = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    setLens({ x, y, width: bounds.width, height: bounds.height });
  }, []);

  const backgroundSize = lens ? `${lens.width * ZOOM_LEVEL}px ${lens.height * ZOOM_LEVEL}px` : undefined;
  const backgroundPosition = lens
    ? `${-(lens.x * ZOOM_LEVEL - LENS_SIZE / 2)}px ${-(lens.y * ZOOM_LEVEL - LENS_SIZE / 2)}px`
    : undefined;

  return (
    <div
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-rose/30"
      onMouseMove={updateLens}
      onMouseEnter={updateLens}
      onMouseLeave={() => setLens(null)}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="View full-size image with magnifier"
    >
      <ImageWithFallback src={image.url} alt={image.alt || name} className="h-full w-full object-cover" />
      {lens ? (
        <div
          className="pointer-events-none absolute z-10 hidden rounded-full border-2 border-white/90 bg-white/10 shadow-[0_12px_40px_rgba(48,37,31,0.28)] backdrop-blur-[2px] md:block"
          style={{
            width: LENS_SIZE,
            height: LENS_SIZE,
            left: lens.x - LENS_SIZE / 2,
            top: lens.y - LENS_SIZE / 2,
            backgroundImage: `url(${image.url})`,
            backgroundRepeat: "no-repeat",
            backgroundSize,
            backgroundPosition,
          }}
          aria-hidden="true"
        />
      ) : null}
      <span className="pointer-events-none absolute bottom-3 right-3 hidden rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur-sm md:group-hover:block">
        Hover to zoom
      </span>
    </div>
  );
}

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const safeIndex = images.length > 0 ? Math.min(active, images.length - 1) : 0;
  const image = images[safeIndex];

  if (!image) {
    return <div className="flex aspect-[3/4] items-center justify-center rounded-3xl bg-rose/40 font-serif text-6xl text-primary">V</div>;
  }

  return (
    <div>
      <MagnifierImage image={image} name={name} onOpen={() => setLightbox(true)} />

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              aria-label={`View image ${index + 1}`}
              aria-current={index === safeIndex}
              className={`card overflow-hidden p-0 transition ${index === safeIndex ? "ring-2 ring-primary" : "opacity-85 hover:opacity-100"}`}
              onClick={() => {
                setActive(index);
                setLightbox(false);
              }}
            >
              <div className="aspect-[3/4] w-full bg-rose/20">
                <ImageWithFallback src={item.url} alt={item.alt || `${name} image ${index + 1}`} className="h-full w-full object-cover" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-text/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Product image viewer"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-black/40 text-white"
            aria-label="Close image viewer"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
          <div className="max-h-[90vh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <ImageWithFallback src={image.url} alt={image.alt || name} className="max-h-[90vh] w-full rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
