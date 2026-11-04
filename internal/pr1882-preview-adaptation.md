# PR 1882 preview adaptation

## Contributor source

[PR 1882](https://github.com/foldkit/foldkit/pull/1882), from `raulescobar-g`, targets main. The reviewed contributor head is `1c30d9092b5c9ac5768bfdc45cdc708413b55cea`, based on `a471adb24d750ab9e8d8312edad53ff6f26d961b`. The preview adapts that exact head's shared-attribute alias idea; it does not cherry-pick or merge the PR. At the 2026-11-04 06:34 UTC check, the PR was open, non-draft and unchanged, with no comments, reviews or review threads. Both GitHub workflows required maintainer action; remote CI was not green.

## Preview contract

`Attribute<Message, MountRequirements>` includes both raw `TaggedAttribute` entries and published `ChildAttribute` groups. Element constructors share that alias, which lets the compiler reuse comparisons for shared attribute bundles across Message types. Reading `_tag` from a general Attribute now requires narrowing with `'_tag' in attribute`.

The adaptation preserves the preview's second capability parameter and `ChildAttributeRequirements` transformation. Attribute constructors and runtime handlers still use the raw tagged union. `childAttributes` accepts only raw entries; it rejects wrapping an already-published group again. CustomElement retains the same registered child Mount capabilities as ordinary Html builders. DragAndDrop and Slider's raw producers use the precise raw type.

A named readonly ChildAttribute interface preserves the existing property shape and inferred Mount requirements while allowing external declarations to name the returned type. Runtime processing, dispatcher capture and Mount ownership are unchanged.

## Focused verification

Before-fix controls failed for ChildAttribute input assignment and a valid child Mount passed through CustomElement. The focused Source checks and isolated emitted/relocated consumers pass with native TypeScript and TypeScript 6.0.3, with full library checking. They cover ordinary, keyed, void, textarea and CustomElement inputs; exact Message payloads and Mount registrations; and double-wrap rejection. Mutation controls detect a widened raw publisher and erased Mount requirements. Five focused runtime files pass, 57 tests. The four changed runtime modules emit identical JavaScript after type erasure and comment removal.

Alternating before/after and after/before isolated checks produced these two-run medians:

| Shared-bundle workload       |              Before |               After |
| ---------------------------- | ------------------: | ------------------: |
| 200 view Message types       | 302.5 ms, 150435 KB |  79.5 ms, 123936 KB |
| 1000 view Message types      |  1617 ms, 353176 KB |   401 ms, 250746 KB |
| 200 mixed local/child arrays | 830.5 ms, 153282 KB | 858.5 ms, 153290 KB |

The mixed-array control does not improve. These are compiler measurements on a loaded development machine, not rendering benchmarks or a universal structural-comparison guarantee.

The normal shared `pnpm --filter foldkit check:block-type-performance` run also passes. After the final library reader naming, its unchanged Machine workload measures 70054 instantiations and 13402 Types over warmup, below the existing 83700/18800 limits. The new shared-attribute workload measures 114226 instantiations and 29370 Types, below its 114377/29634 limits. All seven original workload files are unchanged. The port does not relax their budgets; separate Workspace instantiation baseline updates belong to the Block API adoption.

## Combined verification

The final coherent core/UI build resolves the declaration blockers. Normal Website and Typing Game Source checks pass. The actual complete Website project emits 461 declarations without Source path substitutions or application annotations; Typing Game emits all 69. All 58 complete current snippets pass Source checks and emit 62 declarations including dependencies. Their relocated consumers pass both native TypeScript and TypeScript 6.0.3 with full library checking and only the external consumer as non-declaration Source.

The separate registration-evidence naming fix also passes its permanent contextual Source controls, external emitter and native/TypeScript 6.0.3 relocated accepted/rejected consumers. No original Source participates in those relocated checks. Combined release checks and publication approval remain owned by the release lead.
