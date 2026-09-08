# A Simple Counter Example

## See the Whole Loop {#overview}

This counter puts the core loop from [Architecture](/core/architecture) into one small application. Its Model holds the count. Its Messages record button clicks. Its update function decides the next count, and its view renders the result.

The example uses two files. `src/main.ts` holds the pure application definitions: Model, Messages, update, init, and view. Larger applications can split those definitions into focused modules. `src/entry.ts` remains the runtime boundary, so tests can import the application without starting it as a side effect.

::Snippet{name="counter" label="counter main.ts"}

The entry imports those definitions and passes them to `Runtime.makeApplication`. `Runtime.run` then starts the application in the selected container.

::Snippet{name="counterEntry" label="counter entry.ts"}

Read the example once for its shape. The next four pages examine the [Model](/core/model), [Messages](/core/messages), [update](/core/update), and [view](/core/view) in order. Later pages extend the same counter with a delayed reset, automatic counting, and saved state to introduce side effects and ongoing work.

Start with the Model, the single data structure that describes the application right now.
