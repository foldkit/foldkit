# Focused Step input and output contracts

The helper type contracts accept an optional `InputMessage` parameter, defaulting
to the existing local `Message`. Producers read `InputMessage`; Commands they
produce still return local `Message`. Runtime implementations are unchanged.

The canonical fixture is `packages/foldkit/declaration-tests/helper-inputs.*`.
Its declaration-only contextual record mirrors the existing native update
handler's `StepContextHint` contract. It tests the helper boundary and does not
implement or claim a new receive builder.

Coverage includes overlapping local/input tags with different payloads, inline
and extracted producers, general and focused helpers, Model-aware and
Message-only producers, fixed function references, exact Command requirements,
local Command outputs, and unchanged default helper usage. Explicitly narrowed
input payloads and Commands returning input-only Messages are rejected.

Extracted producers select complete owning variants assignable to their declared
parameter. They cannot introduce a narrower payload merely by sharing its tag.
The preexisting explicit `any` type-argument limitation documented by
`focused-step.limitations.ts` is preserved; this change does not claim to close
that separate escape hatch.

Run from the repository root:

```sh
packages/foldkit/node_modules/.bin/tsc -p packages/foldkit/declaration-tests/tsconfig.helper-inputs.source.json
node internal/layered-constructor/inmessages/helper-inputs/verify.mjs
```

The independent verifier uses copied built packages, package exports, and
`skipLibCheck: false`. It checks public source, declaration emission, physical
relocation, and three copied-declaration mutations. Mutations must fail through
the fixture rather than creating invalid library declarations. Results and logs
are in `artifacts/`. The same fixture group is registered in the canonical emitted
consumer verifier.

## Verification status

The focused source and package verifier pass all six checks. The existing
`message-steps` source fixture passes, and all 21 runtime tests in
`definitionStep`, `commandsStep`, `fieldStep`, and `outMessageStep` pass.
All seven unchanged compiler fixtures pass after the final helper change; the
protocol audit records the final counts in
`internal/layered-constructor/native-bindings/verification/compiler-budgets.log`.

The full canonical emitted suite has not passed yet. Its latest run stops at
`declaration-tests/accepted.ts:444` because an ordinary Binding now has the new
`connect` string member. This is a separate native Binding surface change; the
old exact-key expectations have been preserved for the lead's decision. The log
is `/private/tmp/foldkit-helper-inputs-emitted-verified.log`. Earlier runs exposed
missing public names for `ConnectExecutable` and `MapBindingResultConfig`; the
protocol audit added their public reexports.
