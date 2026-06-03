"use client";

import { useState } from "react";
import { LISTING_CHOICES, type ListingChoice } from "@/lib/listings";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

/**
 * The four listing-type choices plus the fields that only apply to the selected
 * one (PRD §3). Conditional inputs are mounted only when active, so the browser's
 * `required` validation applies to just the relevant fields. Accepts defaults so
 * the edit form can pre-fill the current type and amounts.
 */
export function ListingTypeFields({
  defaultChoice = "price",
  defaultSellerNet = "",
  defaultStartReserve = "",
  defaultClosesAt = "",
  defaultMarginPct = 12,
}: {
  defaultChoice?: ListingChoice;
  defaultSellerNet?: string;
  defaultStartReserve?: string;
  defaultClosesAt?: string;
  /** Representative margin for the live estimate; the exact per-category band
   * is applied server-side at publish. */
  defaultMarginPct?: number;
}) {
  const [choice, setChoice] = useState<ListingChoice>(defaultChoice);
  const [net, setNet] = useState(defaultSellerNet);
  const netNum = Number(String(net).replace(/[^0-9.]/g, ""));
  const estimate = netNum > 0 ? netNum * (1 + defaultMarginPct / 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {LISTING_CHOICES.map((c) => (
          <label
            key={c.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
          >
            <input
              type="radio"
              name="type"
              value={c.value}
              checked={choice === c.value}
              onChange={() => setChoice(c.value)}
              className="mt-1 accent-brand-600"
            />
            <span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${c.tone}`}
              >
                {c.label}
              </span>
              <span className="mt-1 block text-xs text-slate-500">{c.blurb}</span>
            </span>
          </label>
        ))}
      </div>

      {choice === "price" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Your net price (USD){" "}
            <span className="font-normal text-slate-400">
              - what you take home
            </span>
          </label>
          <input
            name="sellerNet"
            required
            inputMode="decimal"
            value={net}
            onChange={(e) => setNet(e.target.value)}
            placeholder="2500.00"
            className={inputCls}
          />
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            CX adds a category margin (~{defaultMarginPct}%) to set the buyer&apos;s
            price - you keep your full net.
            {netNum > 0 && (
              <>
                {" "}
                Buyers would pay about{" "}
                <strong className="text-slate-900">
                  ${estimate.toFixed(2)}
                </strong>
                ; you keep{" "}
                <strong className="text-slate-900">${netNum.toFixed(2)}</strong>.
              </>
            )}
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-medium text-brand-700">
              Set the buyer&apos;s price yourself (advanced)
            </summary>
            <div className="mt-2 space-y-2">
              <input
                name="customPrice"
                inputMode="decimal"
                placeholder="Buyer price you want, e.g. 2800.00"
                className={inputCls}
              />
              <input
                name="counterReason"
                placeholder="Why this price? (used if it needs review)"
                className={inputCls}
              />
              <p className="text-xs text-slate-400">
                Within the allowed margin band it goes live immediately; outside
                it, it waits for a quick review.
              </p>
            </div>
          </details>
        </div>
      )}

      {choice === "bid" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Starting / reserve bid (USD)
            </label>
            <input
              name="startReserve"
              required
              inputMode="decimal"
              defaultValue={defaultStartReserve}
              placeholder="1000.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Closes at
            </label>
            <input
              name="closesAt"
              required
              type="datetime-local"
              defaultValue={defaultClosesAt}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {(choice === "trade-goods" || choice === "trade-services") && (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Trades connect both parties to arrange directly - no escrow or buyer
          protection applies (reputation matters here). Describe what you have and
          what you&apos;re after in the description below.
        </p>
      )}
    </div>
  );
}
