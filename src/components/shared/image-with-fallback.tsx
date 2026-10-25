"use client";

import type { ImgHTMLAttributes } from "react";

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export function ImageWithFallback({ fallbackSrc = "/images/fallbacks/product.jpg", onError, ...props }: ImageWithFallbackProps) {
  return (
    <img
      {...props}
      onError={(event) => {
        if (event.currentTarget.src !== new URL(fallbackSrc, window.location.origin).href) {
          event.currentTarget.src = fallbackSrc;
        }
        onError?.(event);
      }}
    />
  );
}
