---
'foldkit': minor
---

Add names to Commands

Command is now a struct with `name` and `effect` fields. Create Commands with `Command.make` (dual — data-first or data-last). Transform Commands with `Command.mapEffect` (also dual). Both `make` and `mapEffect` are re-exported from `foldkit` via the `Command` namespace.

**Breaking changes:**

- `Command<T>` is a struct `{ readonly name: string; readonly effect: Effect<T> }`, not `Effect<T>`
- Commands must be created with `Command.make`, not bare Effects

**New features:**

- `Command.make(name, effect)` — creates a named Command
- `Command.mapEffect(command, f)` — transforms the Effect, preserving the name
- Runtime traces Command execution via `Effect.withSpan`

**Migration:**

1. Import: `import { Command } from 'foldkit'`

2. Wrap every bare Effect returned as a Command in `Command.make`:

   ```ts
   // Before:
   Task.focus(selector).pipe(Effect.as(CompletedButtonFocus()))
   // After:
   Task.focus(selector).pipe(
     Effect.as(CompletedButtonFocus()),
     Command.make('FocusButton'),
   )
   ```

3. Replace `Effect.map` on Commands with `Command.mapEffect` for Submodel Command mapping:

   ```ts
   // Before:
   commands.map(command =>
     Effect.map(command, message => GotChildMessage({ message })),
   )
   // After:
   commands.map(
     Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
   )
   ```
