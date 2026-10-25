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
  const priceClass = compact ? "text-sm font-semibold text-primary sm:text-lg" : "text-lg font-semibold text-primary";
  const metaClass = compact ? "text-[11px] sm:text-sm" : "text-sm";
  return (
    <div className={`flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2 ${className}`}>
      <span className={priceClass}>{formatInr(pricePaise)}</span>
      {discount != null && compareAtPricePaise != null ? (
        <div className={`flex flex-wrap items-center gap-1.5 ${metaClass}`}>
          <s className="text-muted">{formatInr(compareAtPricePaise)}</s>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">{discount}% off</span>
        </div>
      ) : null}
    </div>
  );
}
