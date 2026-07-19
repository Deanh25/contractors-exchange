"use client";

import { useEffect, useRef, useState } from "react";
import { LISTING_CHOICES, type ListingChoice } from "@/lib/listings";

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

const FALLBACK_MARGIN = 12;
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * The four listing-type choices + the fields for the selected one (PRD §3). For
 * set-price listings (PRD §7B, corrected model) the seller enters their NET and
 * sees the full pricing calculator: their net, the fixed CX margin (% and $), and
 * the resulting buyer price = net x (1 + margin%). The margin is fixed per
 * category and not negotiable; buyers later negotiate the net via offers, which
 * the seller can turn off per listing ("Accept offers").
 */
export function ListingTypeFields({
  defaultChoice = "price",
  defaultSellerNet = "",
  defaultStartReserve = "",
  defaultClosesAt = "",
  defaultQuantity = "1",
  defaultAcceptsOffers = true,
  margins = {},
  defaultMargin = FALLBACK_MARGIN,
}: {
  defaultChoice?: ListingChoice;
  defaultSellerNet?: string;
  defaultStartReserve?: string;
  defaultClosesAt?: string;
  defaultQuantity?: string;
  defaultAcceptsOffers?: boolean;
  /** Per-category flat margin %; the selected category's margin drives the math. */
  margins?: Record<string, number>;
  defaultMargin?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<ListingChoice>(defaultChoice);
  const [net, setNet] = useState(defaultSellerNet);
  const [reserve, setReserve] = useState(defaultStartReserve);
  const [whatIfBid, setWhatIfBid] = useState("");
  const [category, setCategory] = useState("");
  const [showBuyerView, setShowBuyerView] = useState(false);

  // Track the form's selected trade category (a sibling SearchSelect writes a
  // hidden input) so the margin math matches the chosen category.
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

  const marginPct = margins[category] ?? defaultMargin;
  const netNum = Number(String(net).replace(/[^0-9.]/g, ""));
  const hasNet = netNum > 0;
  const buyerPrice = hasNet ? netNum * (1 + marginPct / 100) : 0;
  const marginAmt = hasNet ? buyerPrice - netNum : 0;

  // Open-for-bid mirrors set-price: the reserve is the seller's NET floor, so the
  // public opening bid = reserve x (1 + margin). The what-if goes the other way,
  // from a hypothetical winning (gross) bid back to the seller's net.
  const reserveNum = Number(String(reserve).replace(/[^0-9.]/g, ""));
  const hasReserve = reserveNum > 0;
  const reserveMargin = hasReserve ? reserveNum * (marginPct / 100) : 0;
  const opensAt = hasReserve ? reserveNum * (1 + marginPct / 100) : 0;
  const whatIfNum = Number(String(whatIfBid).replace(/[^0-9.]/g, ""));
  const hasWhatIf = whatIfNum > 0;
  const whatIfNet = hasWhatIf ? whatIfNum / (1 + marginPct / 100) : 0;
  const whatIfMargin = hasWhatIf ? whatIfNum - whatIfNet : 0;
  // Until the seller types their own, show a worked example (a close at 2x the
  // reserve) so the "what a higher close earns you" strip is never empty.
  const exampleNet = hasReserve ? reserveNum * 2 : 0;
  const exampleGross = exampleNet * (1 + marginPct / 100);
  const wiGross = hasWhatIf ? whatIfNum : exampleGross;
  const wiNet = hasWhatIf ? whatIfNet : exampleNet;
  const wiMargin = hasWhatIf ? whatIfMargin : exampleGross - exampleNet;
  const showWhatIf = hasWhatIf || hasReserve;

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
        <div className="space-y-3">
          <div>
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
              className={`mt-1 ${inputCls}`}
            />
          </div>

          {/* Pricing calculator: full breakdown (seller's consent moment). */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pricing
              </p>
              <button
                type="button"
                onClick={() => setShowBuyerView((v) => !v)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                {showBuyerView ? "Show full breakdown" : "What the buyer sees"}
              </button>
            </div>

            {showBuyerView ? (
              <div className="mt-2">
                <p className="text-xs text-slate-500">Buyers see only:</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {hasNet ? usd(buyerPrice) : "$-"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your net and the margin are never shown to buyers.
                </p>
              </div>
            ) : (
              <dl className="mt-2 space-y-1 text-sm">
                <Row label="Your net" value={hasNet ? usd(netNum) : "$-"} />
                <Row
                  label={`CX margin (${marginPct}%)`}
                  value={hasNet ? usd(marginAmt) : "$-"}
                  muted
                />
                <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                  <dt className="font-semibold text-slate-900">Buyer pays</dt>
                  <dd className="text-lg font-extrabold text-slate-900">
                    {hasNet ? usd(buyerPrice) : "$-"}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-2 text-xs text-slate-400">
              The {marginPct}% category margin is fixed and always applies. You
              keep your full net.
            </p>
          </div>

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

          {/* Negotiable by default; uncheck for a firm price. */}
          <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3">
            <input
              type="checkbox"
              name="acceptsOffers"
              value="on"
              defaultChecked={defaultAcceptsOffers}
              className="mt-0.5 accent-brand-600"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium">Accept offers</span>
              <span className="block text-xs text-slate-500">
                Let buyers negotiate. An accepted offer lowers your net; the
                margin % stays the same. Uncheck for a firm price.
              </span>
            </span>
          </label>
        </div>
      )}

      {choice === "bid" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Your reserve (USD){" "}
                <span className="font-normal text-slate-400">
                  - your net floor
                </span>
              </label>
              <input
                name="startReserve"
                required
                inputMode="decimal"
                value={reserve}
                onChange={(e) => setReserve(e.target.value)}
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

          {/* Potential-earnings breakdown: same flow as the set-price calculator. */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Potential earnings
              </p>
              <button
                type="button"
                onClick={() => setShowBuyerView((v) => !v)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                {showBuyerView ? "Show full breakdown" : "What the buyer sees"}
              </button>
            </div>

            {showBuyerView ? (
              <div className="mt-2">
                <p className="text-xs text-slate-500">Bidding opens at:</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {hasReserve ? usd(opensAt) : "$-"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your reserve and the margin are never shown to buyers.
                </p>
              </div>
            ) : (
              <dl className="mt-2 space-y-1 text-sm">
                <Row
                  label="Your net at reserve"
                  value={hasReserve ? usd(reserveNum) : "$-"}
                />
                <Row
                  label={`CX margin (${marginPct}%)`}
                  value={hasReserve ? usd(reserveMargin) : "$-"}
                  muted
                />
                <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                  <dt className="font-semibold text-slate-900">Bidding opens at</dt>
                  <dd className="text-lg font-extrabold text-slate-900">
                    {hasReserve ? usd(opensAt) : "$-"}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Your reserve is the floor, what you take home if it sells at the
              minimum. The {marginPct}% category margin is fixed. As winning bids
              climb above the reserve, your net climbs with them.
            </p>

            {/* Optional what-if: net at a hypothetical winning bid (not saved).
                Shows a worked example until the seller types their own bid. */}
            <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-white p-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Optional - what a higher close earns you
              </p>
              {showWhatIf && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">
                      {!hasWhatIf && "e.g. "}If it closes at a {usd(wiGross)} bid
                    </span>
                    <span className="font-semibold text-emerald-700">
                      you net {usd(wiNet)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      CX margin ({marginPct}%)
                    </span>
                    <span className="text-slate-600">{usd(wiMargin)}</span>
                  </div>
                </div>
              )}
              <input
                inputMode="decimal"
                value={whatIfBid}
                onChange={(e) => setWhatIfBid(e.target.value)}
                placeholder="Try your own winning bid, e.g. 2240"
                className={`mt-2 ${inputCls}`}
              />
            </div>
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

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-slate-500" : "text-slate-700"}>{label}</dt>
      <dd className={muted ? "text-slate-600" : "font-medium text-slate-900"}>
        {value}
      </dd>
    </div>
  );
}
