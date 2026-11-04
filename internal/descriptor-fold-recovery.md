# Descriptor fold inventory checks

The fixture registers plain, augmented, mutable, forwarding, and connected
policies with `makeComposition`, then checks the raw `bindings`
inventory. It retains exact tuple members, policy and operation types, literal
placement, Command handler requirements, parent OutMessage, and the connected
case's registered sibling graph. The preceding normalized-fold callable,
Context, residual, and registration parity section is unchanged except for
the import used by the new Command requirement assertion.

The consumer imports `PolicyInventoryParity`. The rejected cases prove exact Choice
payloads and the connected fold's required graph.

Focused source, external emission, rejection, and source-free relocation checks
passed under native TypeScript 7.1 beta and strict TypeScript 6.0.3, with
`skipLibCheck: false`. Removing each of the eight rejection directives in an
isolated copy produced its diagnostic. The relocated consumer used 525 inputs,
with no original fixture or framework source inputs. Formatting and scoped
`git diff --check` passed.

Proof configs, command receipts, and compiler output are under
`/private/tmp/foldkit-descriptor-fold-proof-20261104/`. The result receipt is
`result.json`.
