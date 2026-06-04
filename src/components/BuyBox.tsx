"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Adaptive primary action for a marketplace card (commerce-style):
 *  - stockable set-price (qty > 1): quantity stepper capped at the available
 *    count + "Add to cart"
 *  - unique set-price (qty = 1): "Buy this item"
 *  - bid: "Place bid"; trade: "Propose trade"
 * All routes go through the existing checkout/[listingId] flow (with ?qty for
 * stockable). No persistent multi-item cart yet (single-listing checkout).
 */
export function BuyBox({
  listingId,
  type,
  quantityAvailable,
}: {
  listingId: string;
  type: "price" | "bid" | "trade";
  quantityAvailable: number;
}) {
  const stockable = type === "price" && quantityAvailable > 1;
  const [qty, setQty] = useState(1);

  const btn =
    "block w-full rounded-md bg-brand-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-600";
  const step =
    "grid h-8 w-8 place-items-center text-base font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent";

  if (stockable) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-md border border-slate-300">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className={step}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium text-slate-900">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(quantityAvailable, q + 1))}
              disabled={qty >= quantityAvailable}
              aria-label="Increase quantity"
              className={step}
            >
              +
            </button>
          </div>
          <span className="text-xs text-slate-500">
            {quantityAvailable} available
          </span>
        </div>
        <Link href={`/checkout/${listingId}?qty=${qty}`} className={btn}>
          Add to cart
        </Link>
      </div>
    );
  }

  const label =
    type === "bid"
      ? "Place bid"
      : type === "trade"
        ? "Propose trade"
        : "Buy this item";
  return (
    <Link href={`/checkout/${listingId}`} className={btn}>
      {label}
    </Link>
  );
}
