---
'foldkit': minor
---

Refactor all animated UI components to use Transition Submodel

Dialog, Popover, Menu, Listbox, and Combobox now hold a `Transition.Model` submodel and delegate animation lifecycle to `Transition.update`. Transition emits `StartedLeaveAnimating` OutMessage so parents provide the leave-phase command — Dialog uses `defaultLeaveCommand`, while Popover/Menu/Listbox/Combobox race button/input movement detection against transition end via `DetectMovementOrTransitionEnd`.

**Breaking changes across all animated components:**

- Model field `transitionState` replaced with `transition: Transition.Model`
- Messages removed: `AdvancedTransitionFrame`, `EndedTransition`
- Message added: `GotTransitionMessage`
- Commands removed: `RequestFrame`, `WaitForTransitions`
- `TransitionState` re-exports removed

Additional per-component removals:

- Popover: `DetectedButtonMovement` message removed
- Menu: `DetectedButtonMovement` message removed
- Listbox: `DetectedButtonMovement` message removed
- Combobox: `DetectedInputMovement` message removed

Transition module changes:

- OutMessage added: `StartedLeaveAnimating` — emitted when leave advances to `LeaveAnimating`; parent must provide the leave wait command
- New export: `defaultLeaveCommand` — creates the standard `WaitForTransitions` command for parents that don't need custom leave behavior
- New export: `TransitionState` — the state schema, previously only re-exported through individual components
- `ViewConfig.toParentMessage` removed — the Transition view is purely presentational and never dispatched Messages
- `lazy` signature simplified from `(model, toParentMessage, content) => Html` to `(model, content) => Html`

**Migration:** Replace any direct references to removed exports with their Transition module equivalents. Handle `GotTransitionMessage` instead of `AdvancedTransitionFrame`/`EndedTransition`/`DetectedButtonMovement`/`DetectedInputMovement`. Access transition state via `model.transition.transitionState` instead of `model.transitionState`. Remove `toParentMessage` from Transition `view`/`lazy` call sites.
