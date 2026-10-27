"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { Check, Copy, Mail, Share2, X as CloseIcon } from "lucide-react";
import { useStore } from "@/components/storefront/providers";

export type ShareProps = {
  url: string;
  title: string;
  image?: string;
  description?: string;
  className?: string;
};

/* Official Brand SVGs */
export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function XTwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function PinterestIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.199-.334 1.367-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

export function getShareUrls(url: string, title: string, image?: string) {
  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  const encImage = encodeURIComponent(image || "");
  const whatsappText = encodeURIComponent(`${title}\n${url}`);
  const twitterText = encodeURIComponent(`Explore ${title} at THE VELORA:`);
  const emailSubject = encodeURIComponent(`The Velora: ${title}`);
  const emailBody = encodeURIComponent(`I thought you'd love this:\n${title}\n\n${url}`);

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${whatsappText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encUrl}&text=${twitterText}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encUrl}&media=${encImage}&description=${encTitle}`,
    email: `mailto:?subject=${emailSubject}&body=${emailBody}`,
  };
}

/**
 * ProductShareBar: An elegant horizontal share row for the Product Detail Page and Quick View.
 */
export function ProductShareBar({ url, title, image, className = "" }: ShareProps) {
  const [copied, setCopied] = useState(false);
  const store = useStore();
  const shareLinks = getShareUrls(url, title, image);

  async function handleCopy(e: MouseEvent) {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      store.notify("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
    }
  }

  async function handleNativeShare(e: MouseEvent) {
    e.preventDefault();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: `Explore ${title} at THE VELORA`, url });
      } catch {
        // user cancelled
      }
    }
  }

  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className={`flex flex-wrap items-center gap-2.5 pt-4 border-t border-stone-200/80 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
        Share:
      </span>

      <div className="flex items-center gap-1.5">
        {/* WhatsApp */}
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-[#25D366] transition-all hover:bg-[#25D366] hover:text-white hover:scale-105 shadow-2xs"
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>

        {/* Facebook */}
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-[#1877F2] transition-all hover:bg-[#1877F2] hover:text-white hover:scale-105 shadow-2xs"
          title="Share on Facebook"
          aria-label="Share on Facebook"
        >
          <FacebookIcon className="h-4 w-4" />
        </a>

        {/* X / Twitter */}
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-900 transition-all hover:bg-black hover:text-white hover:scale-105 shadow-2xs"
          title="Share on X"
          aria-label="Share on X"
        >
          <XTwitterIcon className="h-3.5 w-3.5" />
        </a>

        {/* Pinterest */}
        <a
          href={shareLinks.pinterest}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-[#E60023] transition-all hover:bg-[#E60023] hover:text-white hover:scale-105 shadow-2xs"
          title="Pin on Pinterest"
          aria-label="Pin on Pinterest"
        >
          <PinterestIcon className="h-4 w-4" />
        </a>

        {/* Email */}
        <a
          href={shareLinks.email}
          className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-700 transition-all hover:bg-stone-800 hover:text-white hover:scale-105 shadow-2xs"
          title="Share via Email"
          aria-label="Share via Email"
        >
          <Mail size={15} />
        </a>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopy}
          className={`grid h-8 w-8 place-items-center rounded-full transition-all hover:scale-105 shadow-2xs cursor-pointer ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
          title={copied ? "Copied!" : "Copy product link"}
          aria-label={copied ? "Copied!" : "Copy product link"}
        >
          {copied ? <Check size={15} className="text-white" /> : <Copy size={15} />}
        </button>

        {/* Native Mobile Share Button */}
        {hasNativeShare ? (
          <button
            type="button"
            onClick={handleNativeShare}
            className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-primary transition-all hover:bg-primary hover:text-white hover:scale-105 shadow-2xs cursor-pointer"
            title="More share options"
            aria-label="More share options"
          >
            <Share2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * ProductCardShareButton: A compact floating share trigger for the Product Card.
 * Displays a clean popover menu with all share options when clicked.
 */
export function ProductCardShareButton({ url, title, image, className = "" }: ShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const store = useStore();
  const shareLinks = getShareUrls(url, title, image);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function toggleOpen(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setOpen((prev) => !prev);
  }

  async function handleCopy(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      store.notify("Link copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      // fallback
    }
  }

  function handleShareLinkClick(e: MouseEvent) {
    e.stopPropagation();
    setOpen(false);
  }

  return (
    <div className={`relative z-20 ${className}`} ref={popoverRef}>
      {/* Share Trigger Button: Selects with filled rose color just like the heart icon */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={open ? `Close share options for ${title}` : `Share ${title}`}
        aria-expanded={open}
        className="block p-1 transition-all duration-200 hover:scale-110 active:scale-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer"
      >
        <Share2
          size={20}
          className={
            open
              ? "fill-rose-500 text-rose-500 stroke-rose-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-all duration-200 scale-110"
              : "stroke-white fill-none stroke-[2] transition-colors hover:text-rose-200"
          }
        />
      </button>

      {/* Animated Icon List: 2-column compact on mobile so all 6 icons are 100% visible above Quick View; 1-column on sm+ */}
      <div
        className={`absolute top-8.5 right-0 w-[62px] sm:w-7 grid grid-cols-2 sm:flex sm:flex-col items-center gap-1.5 pt-0.5 z-30 transition-all duration-300 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp */}
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleShareLinkClick}
          className={`grid h-7 w-7 place-items-center rounded-full bg-black/60 hover:bg-[#25D366] text-white hover:text-white backdrop-blur-xs transition-all duration-200 hover:scale-115 active:scale-90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] border border-white/25 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: open ? "30ms" : "0ms" }}
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
        </a>

        {/* Facebook */}
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleShareLinkClick}
          className={`grid h-7 w-7 place-items-center rounded-full bg-black/60 hover:bg-[#1877F2] text-white hover:text-white backdrop-blur-xs transition-all duration-200 hover:scale-115 active:scale-90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] border border-white/25 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: open ? "60ms" : "0ms" }}
          title="Share on Facebook"
          aria-label="Share on Facebook"
        >
          <FacebookIcon className="h-3.5 w-3.5" />
        </a>

        {/* X (Twitter) */}
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleShareLinkClick}
          className={`grid h-7 w-7 place-items-center rounded-full bg-black/60 hover:bg-black text-white hover:text-white backdrop-blur-xs transition-all duration-200 hover:scale-115 active:scale-90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] border border-white/25 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: open ? "90ms" : "0ms" }}
          title="Share on X"
          aria-label="Share on X"
        >
          <XTwitterIcon className="h-3 w-3" />
        </a>

        {/* Pinterest */}
        <a
          href={shareLinks.pinterest}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleShareLinkClick}
          className={`grid h-7 w-7 place-items-center rounded-full bg-black/60 hover:bg-[#E60023] text-white hover:text-white backdrop-blur-xs transition-all duration-200 hover:scale-115 active:scale-90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] border border-white/25 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: open ? "120ms" : "0ms" }}
          title="Pin on Pinterest"
          aria-label="Pin on Pinterest"
        >
          <PinterestIcon className="h-3.5 w-3.5" />
        </a>

        {/* Email */}
        <a
          href={shareLinks.email}
          onClick={handleShareLinkClick}
          className={`grid h-7 w-7 place-items-center rounded-full bg-black/60 hover:bg-stone-800 text-white hover:text-white backdrop-blur-xs transition-all duration-200 hover:scale-115 active:scale-90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] border border-white/25 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          style={{ transitionDelay: open ? "150ms" : "0ms" }}
          title="Share via Email"
          aria-label="Share via Email"
        >
          <Mail size={13} />
        </a>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopy}
          className={`grid h-7 w-7 place-items-center rounded-full backdrop-blur-xs transition-all duration-200 hover:scale-115 active:scale-90 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] border cursor-pointer ${
            copied
              ? "bg-emerald-600 border-emerald-400 text-white"
              : "bg-black/60 hover:bg-primary border-white/25 text-white hover:text-white"
          } ${open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
          style={{ transitionDelay: open ? "180ms" : "0ms" }}
          title={copied ? "Copied!" : "Copy link"}
          aria-label={copied ? "Copied!" : "Copy link"}
        >
          {copied ? <Check size={13} className="text-white" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}
