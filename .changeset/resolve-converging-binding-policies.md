---
'foldkit': patch
---

Resolve reciprocal child Binding policies without repeatedly expanding the same reachable graph along converging paths. This fixes the reported native TypeScript depth failure for twelve reciprocal Bindings while retaining exact channels, registration checks, and OutMessage-discard rejection.

Policy-produced Commands retain the ownership of the policy that returns them. A parent Command is no longer incorrectly qualified as a child Command when the parent and an ancestor child share a display ID. Runtime routing and lifecycle execution are unchanged.
