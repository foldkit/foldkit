---
'foldkit': minor
'create-foldkit-app': patch
---

Default an omitted contracted Block view to an Element view with no inputs. Element views with inputs now need only `view: { Inputs }`, while Document views remain explicit and intentionally viewless Blocks use `view: false`.

Refresh the scaffolded Foldkit guidance with the same view contract spelling. Legacy Schema-only Block definitions keep their existing semantics.
