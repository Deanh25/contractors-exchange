# Claude Code - Payment Methods System Prompt (Contractors Exchange)

> Saved 07/23/2026. This REPLACES the earlier "Payments module (buyer payment methods +
> Stripe processing)" task in `docs/CX-build-checklist.md`. It builds the buyer payment
> system: stored payment methods on user/company accounts, buyer-selected method at checkout
> (card / ACH / wire), with processing costs absorbed invisibly inside the platform markup.
> Build against existing models. Pause for review after each part.

---

## Key decisions reflected in this prompt

1. **Buyer chooses the method** at checkout - card, ACH, or wire. Not forced by deal size.
2. **Payment methods are stored on the account** (user or company) and selectable at purchase.
3. **Processing fees are INVISIBLE to the buyer** - already absorbed in the platform markup. Never
   show a fee line item, never add a surcharge at checkout.
4. **Net-30 / PO terms: NOT at launch** - design the model so it can be added later.
5. **Card availability threshold is ADMIN-CONFIGURABLE** (not hard-coded) so card fees can't quietly
   destroy margin on very large transactions.

---

## The build prompt

```
Build the CX PAYMENT METHODS system: stored payment methods on accounts, buyer-selected payment
method at checkout, supporting credit/debit CARD, ACH (bank transfer), and WIRE.

=== STEP 0: SURVEY EXISTING CODE FIRST (before building anything) ===
Inspect the current CX codebase and report what ALREADY EXISTS related to payments, checkout,
transactions, and escrow: the Transaction model, any checkout/purchase flow, the stubbed payment
representation, escrow/buyer-protection UI, and the pricing/margin logic (sellerNet, marginPct,
buyerPrice). REUSE and EXTEND what exists - do NOT rewrite working code. Report what you found and
what you plan to build vs. reuse BEFORE making changes.

=== PART 1: STORED PAYMENT METHODS (account level) ===
- Add a PaymentMethod model, owned polymorphically by a party (user OR company - match the existing
  dual-identity pattern): { id, ownerType, ownerUserId?, ownerCompanyId?, type ('card'|'ach'|'wire'),
  label, last4/maskedIdentifier, brand/bankName, isDefault, status, createdAt }.
- NEVER store raw card numbers, full bank account numbers, or routing numbers in our database. Store
  only a processor token/reference plus display-safe metadata (brand, last4, bank name). Design the
  integration so a real processor (e.g. Stripe) supplies the token - payments remain STUBBED for now
  unless I say otherwise, but the data model and flow must be processor-ready.
- Account settings UI: "Payment methods" section where a user (or a company member with
  canActAsCompany) can add, label, set default, and remove payment methods. Show masked identifiers
  only. Server-side gate all mutations to the owning party.

=== PART 2: CHECKOUT - BUYER SELECTS THE METHOD ===
- At purchase/checkout, the buyer picks from their stored payment methods, or adds a new one inline.
- All three types (card / ACH / wire) are selectable by the buyer - do NOT force a method by deal
  size. Show each method's practical characteristics honestly and neutrally (e.g. card = instant;
  ACH = 1-3 business days; wire = same/next day, buyer initiates from their bank).
- CRITICAL - FEES ARE INVISIBLE: the buyer sees ONE price (the existing buyerPrice). Do NOT display
  any processing fee, surcharge, or fee line item, and do NOT change the price based on the method
  chosen. Processing cost is already absorbed in the platform markup.
- Wire flow: since wires are buyer-initiated, generate clear payment instructions + a unique
  reference for the transaction, and mark the transaction as "awaiting wire" until funds are
  confirmed. ACH and card can be initiated in-flow.
- Keep the existing escrow / buyer-protection representation intact - funds (when live) are held
  until delivery confirmation, then released to the seller with CX retaining the margin.

=== PART 3: ADMIN-CONFIGURABLE CARD THRESHOLD (protects margin) ===
- Add an admin setting (superadmin, alongside the margin config): "Card payment maximum" - a dollar
  threshold above which CARD is not offered (ACH/wire only). Default it to a sensible value (e.g.
  $10,000) but make it EDITABLE without code changes.
- Rationale to implement (do not show buyers): card processing (~3%) can exceed CX's gross margin on
  high-value/low-margin items (e.g. used equipment). Above the threshold, present only ACH and wire.
- When card is unavailable due to the threshold, do NOT explain it as a fee issue - simply present
  the available methods (ACH/wire) for that transaction.
- Optionally: on large transactions below the threshold, mark ACH as the "recommended" method
  (a soft nudge, not a block).

=== PART 4: TRANSACTION RECORD ===
- Extend the Transaction model to record: paymentMethodType ('card'|'ach'|'wire'), paymentMethodId
  (reference), paymentStatus (pending|processing|held_in_escrow|released|failed|refunded), and
  processorReference. Keep buyerPrice / sellerNet / margin as-is.
- Store the platform's actual processing cost internally (for admin reporting/net-margin analysis) -
  visible to admin/superadmin ONLY, never to buyers or sellers.

=== NOT IN THIS BUILD (design for, don't build) ===
- Net-30 / PO / invoice terms: NOT at launch. Structure PaymentMethod.type and the checkout flow so a
  'terms' type can be added later without refactoring.
- Live money movement stays stubbed unless I explicitly say to wire up a real processor.

=== KEEP INTACT ===
- sellerNet / marginPct remain private - never exposed to buyers anywhere, including checkout.
- Existing marketplace, negotiation/offer flow, profiles, feed, messaging, and admin modules keep
  working.

=== AFTER BUILDING ===
- Seed: a couple of accounts with saved payment methods of each type, and transactions in different
  payment states.
- Run locally and confirm: methods save/select correctly per party, buyer sees ONE price with NO fee
  line, card disappears above the admin threshold, wire generates instructions + reference, and
  admin can edit the card threshold. Commit + push per part. Note anything stubbed/assumed.
```

---

## Notes

- **The card threshold is the one guardrail** on "buyer chooses freely." Because fees live inside the
  markup, an unrestricted card payment on a $40K machine (~$1,200 in fees) could exceed the gross
  margin on that deal. Making the threshold admin-editable lets Dean tune it against real data.
- **Fees stay invisible:** one price, no surcharge, no line item, price never changes by method.
- **Security:** never store raw card/bank numbers - only processor tokens plus masked display data.
  That is the standard PCI-safe approach.
- **Wire is buyer-initiated**, so it needs instructions + a reference number and an "awaiting wire"
  state - handled differently from card/ACH in the flow.
- **Net-30 is deliberately deferred** but the model is structured so it can be added as another
  payment type later without a refactor.
- **Architecture (CX house rule):** domain logic in `src/lib/services/payments.ts`
  (framework-agnostic, processor-ready); Server Actions / route handlers stay thin shims; secrets in
  env, never committed. Review each part running locally before continuing.
