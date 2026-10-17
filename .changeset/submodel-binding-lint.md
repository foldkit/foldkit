---
'@foldkit/oxlint-plugin': minor
---

Recognize completed Block Bindings in the architecture rules. `no-direct-block-state-update` tracks a parent Model passed to a Binding’s `fold` or a Step composed through `Update.combine`. `require-fold-for-child-update-result` uses a Binding’s matching `read` and `write` to detect discarded child Commands and OutMessages. The Command naming and Mount element checks recognize named Block definition methods. Development guard checks recognize `ApplicationComposition.makeApplication` and `ApplicationComposition.makeElement`. OutMessage forwarding and Message wrapper checks recognize Binding configuration. Diagnostics point to registered Binding operations.

For wrapped keyed Bindings, `no-direct-block-state-update` rejects parent replacement of the nested child Model while allowing the parent to update wrapper metadata and collection membership.

Recognize root-owned Messages in Application completion callbacks and view helpers whose builder type comes from the owning Composition without permitting parents to manufacture foreign child Messages. Accept local Block, Query, and UI factory Message contracts in `Got*` wrappers.

Recognize a feature's own Messages imported from an early `definition.ts` inside owned authoring callbacks and completion configuration. Views and helpers can import their Composition or owner-specific ViewBuilder alias, such as `SearchViewBuilder`, from the owning `composition.ts` or explicit `composition/index.ts` barrel. External consumers do not import `composition/composition.ts`; internal implementation modules may use direct relative sibling imports to avoid barrel cycles. Relative imports from the feature's view, update, and composition directories resolve against that same feature's Definition. Foreign child aliases and paths into another feature retain their diagnostics.

Trace locally named Compositions back to their exact Definition when recognizing owned view callbacks, including `makeView.withInputs`. Both ordinary `Block.define(id, contracts)` and specialized `.define(contracts)` preserve their own Message allowance; foreign child Messages retain their diagnostics.
