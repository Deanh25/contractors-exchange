"use client";

import { useEffect, useRef, useState } from "react";
import { LISTING_CHOICES, type ListingChoice } from "@/lib/listings";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

type Band = { defaultPct: number; minPct: number };
const FALLBACK_BAND: Band = { defaultPct: 12, minPct: 6 };

/**
 * The four listing-type choices + the fields for the selected one (PRD §3). For
 * set-price listings (PRD §7B) the seller enters their NET; CX adds the selected
 * trade category's margin to set the buyer price (live estimate). A seller may
 * counter with a custom buyer price: in-band it goes live, BELOW the category
 * minimum it triggers a red warning + a confirm that it must be reviewed first.
 */
export function ListingTypeFields({
  defaultChoice = "price",
  defaultSellerNet = "",
  defaultStartReserve = "",
  defaultClosesAt = "",
  defaultQuantity = "1",
  bands = {},
  defaultBand = FALLBACK_BAND,
}: {
  defaultChoice?: ListingChoice;
  defaultSellerNet?: string;
  defaultStartReserve?: string;
  defaultClosesAt?: string;
  defaultQuantity?: string;
  /** Per-category margin bands; the selected category's band drives the math. */
  bands?: Record<string, Band>;
  defaultBand?: Band;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<ListingChoice>(defaultChoice);
  const [net, setNet] = useState(defaultSellerNet);
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState("");

  // Track the form's selected trade category (a sibling SearchSelect writes a
  // hidden input) so the band math matches the chosen category.
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const read = () => {
      const el = form.querySelector(
        'input[name="tradeCategory"]',
      ) as HTMLInputElement | null;
      setCategory(el?.value ?? "");
    };
    read();
    const onClick = () => requestAnimationFrame(read);
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    form.addEventListener("click", onClick);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
      form.removeEventListener("click", onClick);
    };
  }, []);

  const band = bands[category] ?? defaultBand;
  const netNum = Number(String(net).replace(/[^0-9.]/g, ""));
  const estimate = netNum > 0 ? netNum * (1 + band.defaultPct / 100) : 0;
  const customNum = Number(String(custom).replace(/[^0-9.]/g, ""));
  const impliedPct =
    netNum > 0 && customNum > 0 ? (customNum / netNum - 1) * 100 : null;
  const belowMin = impliedPct !== null && impliedPct < band.minPct;

  // Confirm-on-submit when below the category minimum (the case we discourage).
  const needsConfirmRef = useRef(false);
  useEffect(() => {
    needsConfirmRef.current = belowMin;
  }, [belowMin]);
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onSubmit = (e: Event) => {
      if (!needsConfirmRef.current) return;
      const ok = window.confirm(
        "This buyer price is below the category minimum, so it must be reviewed before it can go live and won't be visible to buyers until approved. Submit it for review anyway?",
      );
      if (!ok) e.preventDefault();
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Quantity available
            </label>
            <input
              name="quantityAvailable"
              type="number"
              min={1}
              step={1}
              defaultValue={defaultQuantity}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              1 = a single/unique item (one Buy). More than 1 lets buyers pick a
              quantity (capped at what you have).
            </p>
          </div>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            CX adds the category margin ({band.defaultPct}%) to set the
            buyer&apos;s price - you keep your full net.
            {netNum > 0 && (
              <>
                {" "}
                Buyers would pay about{" "}
                <strong className="text-slate-900">${estimate.toFixed(2)}</strong>
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
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Buyer price you want, e.g. 2800.00"
                className={inputCls}
              />
              <input
                name="counterReason"
                placeholder="Why this price? (used if it needs review)"
                className={inputCls}
              />

              {belowMin ? (
                <div className="rounded-md border border-red-300 bg-red-50 p-2.5">
                  <p className="text-xs font-semibold text-red-700">
                    ⚠ Below the {band.minPct}% category minimum (your price implies
                    just a {impliedPct!.toFixed(1)}% margin).
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    This price must be reviewed before it can be posted, and your
                    listing won&apos;t be visible to buyers until it&apos;s
                    approved. Consider raising it to at least{" "}
                    <strong>
                      ${(netNum * (1 + band.minPct / 100)).toFixed(2)}
                    </strong>{" "}
                    to go live right away.
                  </p>
                </div>
              ) : impliedPct !== null ? (
                <p className="text-xs font-medium text-emerald-700">
                  At or above the {band.minPct}% minimum - goes live immediately.
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  At or above the category minimum it goes live immediately; below
                  it, it waits for a quick review.
                </p>
              )}
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
