import { discountPercent, formatInr } from "@/lib/money";

export function PriceDisplay({ pricePaise, compareAtPricePaise, className = "" }: { pricePaise: number; compareAtPricePaise?: number | null; className?: string }) {
  const discount = discountPercent(pricePaise, compareAtPricePaise);
  return (
    <p className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="text-lg">{formatInr(pricePaise)}</span>
      {discount != null && compareAtPricePaise != null ? (
        <>
          <s className="text-sm text-muted">{formatInr(compareAtPricePaise)}</s>
          <span className="text-sm text-primary">{discount}% off</span>
        </>
      ) : null}
    </p>
  );
}
