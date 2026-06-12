# Checkout Wizard (Flows Other People Review)

Code: `checkoutWizard.test.ts` (`Cart | ShippingAddress | ShippingMethod |
Payment | Review | Placing | Confirmed`, plus a deliberately orphaned
`GiftWrap`).

## The problem this solves

Multi-step flows like checkout, onboarding, and KYC are owned as much by
product as by engineering. The flow logic changes often, the changes are
expressed as diagrams in design docs, and the diagrams drift from the code
within weeks. Meanwhile branching rules ("digital carts skip shipping")
must hold in both directions, and back-navigation is where hand-written
wizards reliably break.

## What the machine buys

- The Mermaid output is the review artifact. `toMermaid` emits the actual
  flow, with guard labels on the conditional edges, generated from the same
  table the app executes. The test pins the diagram, so any PR that changes
  the flow shows up as a readable diff of the diagram itself. That is the
  thing a PM can review without reading TypeScript.
- Skip logic is a symmetric pair of guards. Digital carts skip shipping on
  `ClickedContinue` (`when(isShippingRequired)` / `otherwise`), and the same
  pair appears on `Payment.ClickedBack`, sending the user back to where they
  actually came from. The forward and backward rules sit next to each other
  in the table, so an asymmetry is visible rather than discovered by a user
  pressing Back.
- Defense in depth on terms acceptance: `ClickedPlaceOrder` is a guard list
  with no `otherwise`, so placing an order before accepting the terms is
  `Ignored` even if the view forgets to disable the button. The test asserts
  the observable `Ignored` result.
- The orphaned step is caught by analysis. `GiftWrap` models the step a flow
  change left behind: still in the union, still has an outgoing edge, no
  inbound edges. `unreachableStates()` reports it and `deadTransitions()`
  flags its edge, the kind of dead flow code that otherwise survives in a
  hand-written wizard indefinitely.

## Honest limits

- Wizard steps carry data (addresses, payment details), and this example
  threads only one boolean through the states. A real checkout would thread
  form data through every build function, which is the table at its most
  verbose; keeping step data in sibling Model fields and leaving only the
  position in the machine is the more livable split.
- Failure handling for order placement is omitted for brevity; `Placing`
  would need `FailedPlaceOrder` edges in a real flow.
- Parallel concerns (a promo-code panel usable on several steps) do not fit
  a flat machine and would stay in ordinary Model fields beside it.
