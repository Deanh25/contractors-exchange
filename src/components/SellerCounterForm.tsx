"use client";

import { useState } from "react";
import { respondOfferAction } from "@/app/actions/offers";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * Seller's counter control (PRD §7B negotiation panel). The seller types a buyer
 * price and sees their RESULTING NET live ( net = price / (1 + margin%) ), with a
 * one-tap midpoint preset between the buyer's offer and the original ask. Only the
 * seller sees net/margin; the server recomputes authoritatively on submit.
 */
export function SellerCounterForm({
  offerId,
  marginPct,
  buyerOffer,
  askingPrice,
}: {
  offerId: string;
  marginPct: number;
  buyerOffer: number;
  askingPrice: number | null;
}) {
  const midpoint =
    askingPrice !== null
      ? Math.round(((buyerOffer + askingPrice) / 2) * 100) / 100
      : buyerOffer;
  const [price, setPrice] = useState(String(midpoint));
  const priceNum = Number(String(price).replace(/[^0-9.]/g, ""));
  const net = priceNum > 0 ? priceNum / (1 + marginPct / 100) : 0;

  return (
    <details className="mt-2">
      <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-1.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
        Counter
      </summary>
      <form action={respondOfferAction} className="mt-2 space-y-2">
        <input type="hidden" name="offerId" value={offerId} />
        <input type="hidden" name="op" value="counter" />
        <div className="flex items-center gap-2">
          <input
            name="buyerPrice"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          {askingPrice !== null && (
            <button
              type="button"
              onClick={() => setPrice(String(midpoint))}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Midpoint {usd(midpoint)}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          You would net{" "}
          <strong className="text-slate-900">
            {priceNum > 0 ? usd(net) : "$-"}
          </strong>{" "}
          at the {marginPct}% margin.
        </p>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Send counter
        </button>
      </form>
    </details>
  );
}
