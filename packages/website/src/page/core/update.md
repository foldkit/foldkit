# Update

## One Function Defines Every Transition {#overview}

The update function receives the current Model and a Message, then returns the next Model and any Commands for the runtime to execute. It is the only place application state changes.

Update is pure. Given the same Model and Message, it returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. That makes a transition direct to test: pass in the inputs and assert on the returned values.

Use `Message.match` to handle the Message union. If you add a Message and omit its branch, TypeScript reports the missing case. No `default` branch silently absorbs a new variant.

Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) for other tagged unions, partial matches, fallbacks, and one handler shared across several tags.

::Snippet{name="counterUpdate" label="update example"}

Each branch describes one transition. `ClickedDecrement` and `ClickedIncrement` transform the current count. `ClickedReset` replaces it with zero. This version of the counter has no side effects, so all three omit `commands`.

The branches build their next Model with [evo](/best-practices/immutability#immutable-updates). Each named field receives a function from its current value to its next value. Omitted fields keep their existing values and references, so the same update style continues to work as the Model grows.

Update returns a record containing the next Model and, when needed, an array of Commands. A Command describes one side effect, such as an HTTP request, timer, or browser API call. The [Commands](/core/commands) page adds a delayed reset and puts the optional `commands` field to work.

First, the [view function](/core/view) completes the basic loop by turning the Model into what the user sees.
