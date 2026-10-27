import { discountPercent, formatInr } from "@/lib/money";

export function PriceDisplay({
  pricePaise,
  compareAtPricePaise,
  className = "",
  compact = false,
}: {
  pricePaise: number;
  compareAtPricePaise?: number | null;
  className?: string;
  compact?: boolean;
}) {
  const discount = discountPercent(pricePaise, compareAtPricePaise);
  const priceClass = compact ? "text-base sm:text-lg font-bold text-text tracking-tight" : "text-xl sm:text-2xl font-bold text-text tracking-tight";
  const compareClass = compact ? "text-xs sm:text-sm text-muted line-through font-normal" : "text-sm sm:text-base text-muted line-through font-normal";
  const badgeClass = compact ? "rounded-md bg-[#f6eee9] px-1.5 py-0.5 text-[11px] sm:text-xs font-semibold text-primary" : "rounded-md bg-[#f6eee9] px-2 py-0.5 text-xs sm:text-sm font-semibold text-primary";
  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className={priceClass}>{formatInr(pricePaise)}</span>
      {discount != null && compareAtPricePaise != null && compareAtPricePaise > pricePaise ? (
        <>
          <s className={compareClass}>{formatInr(compareAtPricePaise)}</s>
          <span className={badgeClass}>{discount}% off</span>
        </>
      ) : null}
    </div>
  );
}
