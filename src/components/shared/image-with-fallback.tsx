"use client";

import type { ImgHTMLAttributes } from "react";

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export function ImageWithFallback({ fallbackSrc = "/images/fallbacks/product.jpg", onError, alt = "", ...props }: ImageWithFallbackProps) {
  return (
    // Dynamic product URLs need a browser-side fallback, which next/image does not provide.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      onError={(event) => {
        if (event.currentTarget.src !== new URL(fallbackSrc, window.location.origin).href) {
          event.currentTarget.src = fallbackSrc;
        }
        onError?.(event);
      }}
    />
  );
}
