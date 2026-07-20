# Proposal | TEA-specific language-service diagnostics

Status: draft proposal for #614. Companion to #613 (wiring `@effect/language-service`).

Wiring `@effect/language-service` gives Foldkit apps the generic Effect-4 lens.
Foldkit also has TEA-shaped invariants that a generic Effect checker does not
know about. This document sketches three of them concretely, so the intent is
unambiguous before anyone commits to an implementation. These would most likely
live as Foldkit-authored language-service rules (a Foldkit ruleset), not in core
`@effect/language-service`, since they encode Elm Architecture semantics rather
than Effect semantics.

The syntactic `@foldkit/oxlint-plugin` cannot express these: each needs the type
checker (the Message union, the `update` return type, the Command type) to decide
whether the code is correct. That is exactly what a language-service rule has and
an oxlint rule does not.

## 1. `update` purity

An `update` function is pure: it returns the next Model and Commands. Side effects
belong in Commands. A rule would flag a side-effecting call performed directly in
the `update` body rather than described as a returned Command.

Bad. The fetch fires as a side effect during `update`:

```ts
const update = (message: Message, model: Model) =>
  M.value(message).pipe(
    M.tag('ClickedRefresh', () => {
      fetch('/api/weather') // side effect performed inside update
      return withReturnType<UpdateResult>()([model, []])
    }),
    M.exhaustive,
  )
```

Good. The effect is a returned Command:

```ts
const update = (message: Message, model: Model) =>
  M.value(message).pipe(
    M.tag('ClickedRefresh', () =>
      withReturnType<UpdateResult>()([model, [FetchWeather()]]),
    ),
    M.exhaustive,
  )
```

Detection sketch. Inside a function whose return type is the Foldkit update result
tuple, walk the body for call expressions whose type is `Effect<...>`, a Promise,
or a known impure global (`fetch`, `Date.now`, `Math.random`, `localStorage`), and
that are not part of the returned Command array. Report each as a diagnostic that
points at the returned Command as the fix.

## 2. Command discipline

A Command that is constructed but never returned or dispatched is almost always a
bug: the effect silently never runs. This is the TEA-level cousin of the Effect
floating-value check, specialized to the Command type.

Bad. `FocusButton()` is built and dropped:

```ts
M.tag('OpenedDialog', () => {
  FocusButton('confirm') // constructed, never returned
  return withReturnType<UpdateResult>()([model, []])
})
```

Good:

```ts
M.tag('OpenedDialog', () =>
  withReturnType<UpdateResult>()([model, [FocusButton('confirm')]]),
)
```

Detection sketch. Track expressions whose type is a Command. If a Command-typed
expression is discarded (expression statement, unused `const`) rather than flowing
into a returned Command array or a Command combinator, report it.

## 3. Message exhaustiveness

Foldkit already leans on `M.tagsExhaustive` and `M.exhaustive`, which TypeScript
enforces at the type level. A dedicated diagnostic raises the signal from a deep
structural type error to a precise, actionable message, and can cover the cases
the compiler misses: a `Match` chain that forgot `M.exhaustive`, or a hand-written
`switch` over `message._tag` with no exhaustive guard.

Bad. A new Message variant `PressedEscape` is added to the union but the `Match`
chain is not exhaustive, so it is silently unhandled:

```ts
M.value(message).pipe(
  M.tag('ClickedRefresh', () => /* ... */),
  M.tag('SubmittedForm', () => /* ... */),
  M.orElse(() => withReturnType<UpdateResult>()([model, []])), // swallows PressedEscape
)
```

Good. Exhaustive matching surfaces every unhandled variant at the call site:

```ts
M.value(message).pipe(
  M.tag('ClickedRefresh', () => /* ... */),
  M.tag('SubmittedForm', () => /* ... */),
  M.tag('PressedEscape', () => /* ... */),
  M.exhaustive,
)
```

Detection sketch. When a `Match` value is derived from a Message-typed value and
resolves with `M.orElse` (or an untyped `switch` default) rather than
`M.exhaustive`, report the unmatched variants by name. This turns "you have a
catch-all over your Message union" into a listed set of facts the author can act
on.

## Scope and next steps

This is a proposal, not an implementation. The open questions:

- Do these belong in one Foldkit ruleset package, or upstreamed individually?
- How should a rule identify "a Foldkit update function" and "a Command" robustly
  (return-type shape, a branded type, or a marker export from `foldkit`)?
- Which are worth building first? Command discipline reuses the most machinery
  from the existing floating-Effect check, so it is the natural pilot.

Feedback on appetite and on the identification strategy would shape which of these
gets built.
