# Constructor and provider alternatives

Checked completion validates each constructor alternative's plans, acquired
children and providers together. A handler missing from one possible Layer
cannot be supplied by another Layer that might have been selected instead.
Valid alternatives with matching updates and providers retain their exact
contracts.

## Validation

The native completion validator distributes constructor alternatives before
checking their Sources, registered children and handler completeness. Nonempty
failure tuples are collected, so one valid alternative cannot hide an invalid
alternative. The ordinary single-body path retains the direct validator.

InMessage completion separately preserves each alternative's Source and Context,
rejects erased Sources and requires the input update in every alternative.
Compiled InMessage operations and runtime-closed implementation facts are
projected per alternative, including their Command requirements. Host handler
selection checks the original pending contracts of every possible selected
implementation Layer.

The internal Layer output helper retains only Services guaranteed by every
possible provider. It lives in a type-only leaf module shared by completion and
dependency checking, keeping unrelated Machine declarations bounded.

## Evidence

The permanent `constructor-union-ownership` declaration fixtures include aligned
Composition and child unions, exact Layers, matching update/provider alternatives
and original host-handler selections. Their eleven negative cases cover crossed
Sources, missing input updates, erased Sources, crossed or missing children,
incomplete provider alternatives and combined unrelated host handlers. Matching
Command-producing InMessage updates have their own provider alternatives.

Native and strict TypeScript 6 source checks pass. Strict TypeScript 6 also
consumes the built declarations. Against the frozen preceding declarations,
the same fixture fails with nine unused expected-error directives. The
corrected declarations reject those calls without changing the fixture. This
control does not mutate live source or distribution files.

The public type-only handler-facts export keeps inferred selected Layer
declarations nameable. Consumers need no result annotations.

The recovered nine-check source, emitted, selected-provider, Source-ownership
and split-consumer harness passes. Six focused runtime files pass 41 tests.
The independent review reproduced runtime rejection of crossed plans and child
connections, and a missing-Service failure for an incomplete provider admitted
by the preceding declarations. Runtime construction and occurrence lifecycles
are unchanged by these type validation fixes.

The ordinary declaration suite also checks the permanent fixture after emitting
the public package. Full suite completion and the Query/UI-family proof are
tracked separately; these focused results do not establish broad adoption.

## Accepted compiler cost

All seven original workloads pass. The retained original/adapted driver passes
all eight runs with unchanged fixture bodies and assertions. Only the two
previously accepted Workspace instantiation baselines are updated to the exact
observed counts after the correctness checks:

| Workload    | Accepted checkpoint | Current count | Added cost |
| ----------- | ------------------: | ------------: | ---------: |
| Workspace 4 |           2,687,288 |     2,687,983 |     0.026% |
| Workspace 8 |           4,999,644 |     5,002,523 |     0.058% |

There is no additional tolerance. All other instantiation and Types ceilings
are unchanged. Machine measures 70,759 instantiations and 13,405 Types.

The relocation preparation script creates a fresh temporary destination for
each invocation, preserving previous artifacts and allowing repeated checks.
Two successive preparations each pass native and strict TypeScript 6 checks.
Raw receipts remain under the isolated proof's `probe/constructor-alternative-controls/`
and the retained compiler driver's run-owned directory.

Publication and source transfer for security review require the user's separate
approval.
