# Reciprocal Binding policy closure

## Status

The local candidate fixes the compiler failure reported in [#1772](https://github.com/foldkit/foldkit/issues/1772). This is an unpublished implementation checkpoint, not a registry release or a claim that all composition sizes compile without limits. Final verification must include the other reopened preview work.

## Reproduction and attribution

The public reproduction is pinned at [9e08ee58f38e5bc2becab8dc8c546fa5b732287c](https://github.com/kattsushi/foldkit-blocks-policy-repro/tree/9e08ee58f38e5bc2becab8dc8c546fa5b732287c). The report's nine-Binding control compiles on published `1f6776fa7ece`, while twelve reciprocal Bindings fail with TS2589, TS5114 and TS5115. Each policy informs three siblings; the actual update increments exactly three counters and terminates.

The same twelve-Binding source failed against the pre-fix local candidate with 10,309,506 instantiations. Reading policy evidence through its direct retained function, without changing traversal, still failed at 10,309,168. That control rejects the idea that evidence extraction alone fixes this graph.

The final isolated closure compiles the unchanged twelve-Binding reproduction with 391,295 instantiations and the nine-Binding control with 317,870. The twelve-Binding runtime returns `[0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]` and no Commands. These compiler counts describe the isolated closure checkpoint, not the final aggregate candidate. Raw controls are under `/private/tmp/foldkit-reciprocal-policy-20261024`.

## Implementation

The old resolver recursively constructed complete update returns along every policy path. Converging reciprocal paths repeated work with different visited-placement unions.

The new resolver collects reachable Binding markers in frontiers, retaining one visited-placement set. Each reachable placement contributes its direct Message, OutMessage, requirements, and registration channels once. Those channels are combined before constructing the result contract. Policies with no deferred work retain a direct path.

Combined-Step obligations are checked against a fresh reachable closure. Reaching a placement earlier must not hide an OutMessage that a nested or self-referential combination would discard. Original policy validation still checks exact payloads, parent Steps, declared OutMessages, and registered sibling use.

The change is entirely type-level. It adds no Runtime phase, dispatch queue, lifecycle scope, or consumer annotation.

## Ownership correction

An independent Astra Max review found a supported case that distinguishes the encodings. A parent named `Alpha` binds a child also named `Alpha` and another child named `Beta`. The Alpha policy calls Beta; Beta's policy returns the parent-owned `Alpha/ParentWork` Command.

The old recursive resolver qualified that parent handler through the ancestor Alpha placement. The new resolver qualifies each policy's direct child-owned requirements at their origin and retains the parent requirement unchanged. Source and emitted proofs agree with Runtime's unscoped `Alpha/ParentWork` result.

The foreign-child control remains rejected: Beta cannot lift an unbound Alpha child Command. The new contract retains its unbound requirement, assembly rejects the missing provider, and erased Runtime execution rejects its ownership.

## Verification

- The isolated final closure passes the complete core external declaration suite: acceptance, rejection, emission, relocation, native completion, and configuration documentation.
- The permanent split-file `policy-graph` declaration group covers twelve reciprocal placements, omitted sibling registration, and the same-display-ID ownership case.
- Framework runtime regressions cover the finite twelve-placement transition and parent Command ownership.
- Existing nested-combination, self-reference, reciprocal coordination, and channel-erasure rejection fixtures remain required.
- An independent Astra Max review found no blocking correctness issue and verified ownership and foreign-child mutation controls.

All five existing compiler ceilings pass at the isolated checkpoint:

| Fixture                                | Instantiations |   Types |
| -------------------------------------- | -------------: | ------: |
| Deep composition, eight levels         |        605,194 |  52,034 |
| Wide composition, one hundred children |      1,155,836 |  74,203 |
| Two hundred Command requirements       |        332,643 |  62,402 |
| Workspace, four groups                 |      2,524,670 | 203,888 |
| Workspace, eight groups                |      4,284,786 | 277,945 |

No budget was increased. These are count checks; they do not establish editor latency or long-session memory stability. The ordinary Workspace root's separate TS7056 serialization limit remains a distinct release consideration.
