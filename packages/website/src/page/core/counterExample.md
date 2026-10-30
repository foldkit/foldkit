# A Simple Counter Example

## See the Whole Loop {#overview}

### The Application Block {#application-definitions}

This counter puts the core loop from [Architecture](/core/architecture) into one small application. Its Model holds the count. Its Messages record button clicks. Its update handlers decide the next count, and its view renders the result.

The example uses two files. `src/application.ts` declares the root Block, `Application`, as a class with its Model and Message Schemas, and implements it with `Application.make`. The constructor passed to `make` returns the starting Model, one update handler per Message, and the view. `make` returns `ApplicationLive`, a Layer. Nothing runs yet: importing the file in a test does not start the application.

::Snippet{name="counter" label="Counter application"}

### Runtime Entry

`src/entry.ts` passes the class, its Layer, and the page container to `Program.make`. The returned `program` describes the application. `Runtime.run` builds the Layer, constructs the root instance from the starting Model, and starts the loop.

::Snippet{name="counterEntry" label="Counter entry.ts"}

### Where to Go Next

Read the example once for its shape. The next four pages examine the [Model](/core/model), [Messages](/core/messages), [update](/core/update), and [view](/core/view) in order. Later pages extend the same counter with a delayed reset, automatic counting, and saved state to introduce side effects and ongoing work.

Start with the Model, the single data structure that describes the application right now.
