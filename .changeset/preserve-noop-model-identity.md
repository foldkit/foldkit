---
'foldkit': patch
---

Preserve Model identity for unchanged field transformations and child folds.

`modifyFields` and `makeModifyFieldsFor` return the original Model when every produced field is unchanged according to `Object.is`. They retain Effect's `Struct.evolve` semantics for own enumerable source fields, including Symbol keys.

`Update.foldChild`, `Update.foldChildAt`, `Update.foldChildStep`, and `Machine.fold` skip the parent placement write when the child's next Model is identical to its previous Model. Commands still propagate, and child OutMessages still run their parent reactions and forwarding policies. Placement writers should only place the next child Model; use an OutMessage policy for parent reactions that must run even when the child Model is unchanged.
