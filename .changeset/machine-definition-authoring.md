---
'foldkit': minor
'create-foldkit-app': patch
---

Bind Machine contracts once with `Machine.makeDefinition({ State, Message, Context? })`, author guards, handlers, and transition maps through that Definition, and finish with `Definition.makeMachine(...)`. Command requirements now infer their union across local and shared edges, including nested Machines. Option guards retain their exact unwrapped value; mixed boolean/Option guards include `void`.

This replaces the experimental curried `Machine.define(schemas)(table)` API and standalone authoring helpers. Destructure `to`, `when`, `otherwise`, and `ignore` from the Definition. Guards now receive one object containing `state`, `message`, and declared `context`. Replace `forStates(tags).on(on)` with `Definition.makeSharedTransitions(tags, { on })`. Use `makeTransitions(source, { on })` for an extracted state entry, `makeGuard({ from, on }, producer)` for an extracted guard, and `makeHandler(selector, producer)` or `makeHandler(guard, producer)` for an extracted handler. Selector-authored handlers receive State, Message, and Context; guard-authored handlers also receive the exact `guardValue`.

Named helper, handler, and tagged-union Schema interfaces also keep exported authoring helpers and nested State declarations portable.

Execution remains pure. Transition outcomes, folding, graph inspection, and reachability analysis retain their contracts. The scaffold and active guidance describe the new authoring path.
