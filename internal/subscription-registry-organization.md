# Subscription registry organization

Each Block declares its local Subscriptions in one `Definition.makeSubscriptions`
registry. Fully attached registries contribute `subscriptions.layer` to the local
`EffectsLayer`. Substantial dependency selectors and Stream implementations can
live in focused helper modules. Distinct child Blocks keep their own registries.

## Adoption audit

- Website consolidates active-section, search-shortcut, system-theme and viewport
  entries into its Application registry. The active-section dependency selector
  and observer Stream are extracted; the other handlers stay beside their entry
  declarations. Root Layer composition uses `Subscription.subscriptions.layer`.
- All 15 example registries already follow this convention. Workspace has four
  distinct owners: Application, CommandPalette, ProjectSettings and NotificationCenter.
- Typing Game Home and Room, UI Toast, DragAndDrop and Slider, and the DevTools
  overlay already follow the convention. Slider factories create distinct Blocks.
- Active snippets already declare one registry per owner. Scaffolds, active docs,
  repository guidance and app skills now state the convention explicitly.

`Subscription.aggregate` remains appropriate at graph, adapter and test boundaries
that join independent records. Framework contract fixtures, compiler-performance
controls and historical published examples retain their deliberate forms.

## Verification scope

The Website typecheck, application/Effect lint, production build, 35 existing
root/search Story tests and three existing search/mobile browser checks pass.
An AST comparison confirms
the active-section selector body, observer Stream expression and three other
complete entry declarations are unchanged by extraction. Independent application
review confirms the same entry names, keys, owner, dependencies, declared Messages,
Layer requirements, passive construction and Stream cleanup.

The build retains its chunk-size warning; API generation retains 281 Foldkit and
21 UI TypeDoc warnings. The browser checks retain development slow-view/patch
warnings. They are functional acceptance, not rendering-performance evidence.
The first build attempt could not verify the global package-manager launcher;
the rerun uses the existing cached pnpm 11.8.0, matching the prepared toolchain.
The prior Lustre measurements and
packed-package evidence retain their original source pins. Publication remains held.
