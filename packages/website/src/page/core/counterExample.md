# A Simple Counter Example

## See the Whole Loop {#overview}

### Application Definitions

This counter puts the core loop from [Architecture](/core/architecture) into one small application. Its Model holds the count. Its Messages record button clicks. Its update function decides the next count, and its view renders the result.

The example uses two files. `src/application.ts` defines the typed `Application` with its Model and Message contracts, creates the named graphless `ApplicationComposition`, then authors init, update, and the primary view through that Composition. Each `make*` method returns a function or configured value without calling it. `src/entry.ts` completes the same Composition with init, update, view, and the browser container, producing a passive runtime input for `Runtime.run`. Importing the application pieces in a test does not start the browser application. When a larger root extracts one of these responsibilities, split all of its standard pieces into their named files as described in [Project Organization](/patterns/project-organization#root-application-assembly).
::Snippet{name="counter" label="Counter Application"}

### Runtime Entry

The entry imports `ApplicationComposition` and the implementation pieces, then calls the Composition's owned `makeApplication` method. The returned lowercase `application` is passive configuration. `Runtime.run` constructs its Layers and starts the application.
::Snippet{name="counterEntry" label="Counter entry.ts"}

### Where to Go Next

Read the example once for its shape. The next four pages examine the [Model](/core/model), [Messages](/core/messages), [update](/core/update), and [view](/core/view) in order. Later pages extend the same counter with a delayed reset, automatic counting, and saved state to introduce side effects and ongoing work.

Start with the Model, the single data structure that describes the application right now.
