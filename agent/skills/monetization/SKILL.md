---
description: Use when designing an offer, creating a Stripe product or price, pricing a class, or reasoning about revenue.
---

# Monetization

## What exists

- **KeyCrate**: the subscription product (DJ key and harmonic-mixing library). Stripe
  subscription webhooks grant access in `kc_access`. This is the recurring revenue line.
- **Classes and tickets**: one-off Checkout sessions (yoga, movement, happy hour events).
- **Books, vitamins, gear pages**: affiliate and referral traffic, no Stripe object yet.
- **The content engine**: audience growth that feeds all of the above.

## The ladder

Free post → free page on vitaegis.com → email or follow → low-ticket product (a class, a
guide, a deck) → KeyCrate subscription or a cohort. Every post should point one rung up.

## Creating an offer in Stripe

Use the `stripe` connection. Reads are free; every write pauses for the operator.

1. `search` or `list_products` to make sure it does not exist.
2. Draft the product: name in the brand voice, a one-line description, the pillar as metadata.
3. Draft the price: one-off or recurring, USD, and a round number that ends in 9 or 0.
4. Ask the operator with `ask_question` if the price is a judgement call.
5. Create the product, then the price, then a payment link. Each write is one approval.
6. Hand back the payment link URL and the exact caption line to use with it.

Never create a coupon, refund, or subscription change without being asked for that
specifically. Never touch live customer data beyond reading it.

## Measuring

- `revenue_snapshot` for gross, net, MRR, balance.
- PostHog (when connected) for which page or post drove the checkout.
- Tie every idea in the growth brief to a `revenue_path` line, even if it is "audience now,
  product later".

## Pricing guardrails

- A class under 25 USD, a guide or deck 9 to 29 USD, a cohort 99 USD and up.
- KeyCrate's price is set; do not propose changing it without a reason tied to churn or
  conversion numbers.
