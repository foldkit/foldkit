# Post-Generation Verification Checklist

Run through each category after generating an app. Fix any issues before presenting the result.

## Structural completeness

- [ ] Every `m()` declaration is included in the `S.Union`
- [ ] Every union member has a case in `M.tagsExhaustive` in update
- [ ] Every route variant has a corresponding view branch
- [ ] Every `Succeeded*` has a paired `Failed*`
- [ ] Every discriminated union variant is handled in both update and view

## Purity

- [ ] update function has no side effects (no DOM, no randomness, no I/O)
- [ ] view function has no side effects
- [ ] init function has no side effects (returns Commands for startup work)
- [ ] No `let` declarations anywhere
- [ ] No mutation (`.push()`, `.splice()`, object mutation)
- [ ] No `Effect.runSync` / `Effect.runPromise` outside of Commands

## Commands

- [ ] Every Command identity defined with `Command.define` and assigned to a PascalCase constant
- [ ] Every `Command.define` includes result Message schemas after the name
- [ ] No inline `Command.define` in pipe chains — always stored as a constant
- [ ] Definitions colocated with the update that produces them
- [ ] Every Command catches all errors: `Effect.catchAll(() => Effect.succeed(FailedX(...)))`
- [ ] Return types inferred — no explicit `Command<typeof A>` annotations
- [ ] Factory functions named by action: `fetchWeather`, not `fetchWeatherCommand`
- [ ] Fire-and-forget Commands return `Completed*` Messages

## Naming

- [ ] Messages are past-tense, verb-first
- [ ] `Completed*` uses verb+object order: `CompletedFocusInput` not `CompletedInputFocus`
- [ ] Option fields prefixed with `maybe`
- [ ] Boolean fields prefixed with `is`
- [ ] No abbreviations anywhere
- [ ] Constants for all magic numbers
- [ ] Schema literals are capitalized: `S.Literal('Active', 'Inactive')`

## State modeling

- [ ] Discriminated unions for multi-valued state (not booleans)
- [ ] `Option` for absent fields (not empty strings, null, or zero)
- [ ] Impossible states are unrepresentable
- [ ] `ts()` for non-Message tagged structs (Model states, route variants)
- [ ] `m()` only for Message variants

## Effect-TS patterns

- [ ] `pipe()` only for multi-step chains (not single operations)
- [ ] `M.tagsExhaustive` for all Message/state matching (no switch)
- [ ] `Array.isEmptyArray` / `Array.isNonEmptyArray` (not `.length === 0` or `.length > 0`)
- [ ] `evo()` for Model updates (not spread)
- [ ] Callable constructors (not `as` casts or manual `_tag` objects)
- [ ] `Option.match` preferred over `Option.map` + `Option.getOrElse`

## View

- [ ] `keyed` wrappers on layout branches (route-based or state-based)
- [ ] Events dispatch Messages, never perform actions directly
- [ ] Semantic HTML elements (`main`, `nav`, `section`, `article`, `header`, `footer`)

## Foldkit UI

- [ ] Foldkit UI components used where interaction matches (Dialog, Tabs, Menu, Combobox, etc.) — never hand-roll accessible widgets
- [ ] Each UI component has its Model in the app Model, a `Got*` Message, init in init, and delegation in update
- [ ] No custom keyboard navigation or ARIA attributes for patterns covered by Foldkit UI components

## File organization

- [ ] Message layout follows four-group convention (values, union + type)
- [ ] Section headers used in single-file apps: `// MODEL`, `// MESSAGE`, etc.
- [ ] Complex update handlers extracted to separate functions
- [ ] view decomposed when branches exceed ~30 lines

## Testing

- [ ] `main.test.ts` (or `update.test.ts`) exists with `Test.story` pipelines
- [ ] Every fallible Command (`Succeeded*`/`Failed*` pair) tested for both outcomes
- [ ] At least one multi-step test that chains Messages and Command resolutions
- [ ] Submodel tests assert `outMessage` when the child signals to parent
- [ ] Tests use `Test.resolve(Definition, resultMessage)` — never run Command Effects directly in story tests
- [ ] All tests pass with `npx vitest run`
