# Crash View

## Runtime Failure {#overview}

When an unrecoverable error escapes update, view, or a Command, Foldkit stops the application and renders a crash view. No later Message will run. Recoverable failures should become Messages instead, so update can decide what the person sees next.

### Defining a Crash View

#### Crash Context

The default crash view shows the error message and a reload button. To replace it, pass `crash.view` to `makeApplication`. The function receives a `CrashContext`, followed by `h`. The context has four fields:

- `error` is the error that stopped the application.
- `model` is the Model at the time of the crash.
- `message` is the Message being processed, wrapped in `Option`. It is `None` when the initial render crashes.
- `maybeReleaseError` is the error raised while Foldkit released the application's Command, Subscription, and Managed Resource fibers and its open dialogs after the crash, wrapped in `Option`. It is `None` when every finalizer completed. That [release](#resource-release-on-crash) is where the application's own `Effect.acquireRelease` finalizers run.

::Snippet{name="crashViewCustom" label="Custom crash view"}

#### No Runtime Dispatch

The builder is `HtmlBuilder<never>` because Foldkit can no longer dispatch Messages. Event helpers such as `h.OnClick` therefore fail to compile instead of creating handlers that cannot run.

### Browser Actions After a Crash

#### Raw Browser Events

For an action that does not need Foldkit, set a raw DOM event attribute. For example: `h.Attribute('onclick', 'location.reload()')` reloads the page through the browser.

:::Info{label="Only in crash.view"}
In a normal Foldkit app, always use `OnClick` with Messages, never raw DOM event attributes. `crash.view` is the one exception because the runtime is no longer running.
:::

#### Crash View Failures

If the custom crash view throws, Foldkit renders the default crash screen with both errors.

### Resource Release on Crash

Before the crash view renders, Foldkit releases everything the running application holds. The application has stopped, so nothing it started should keep running and nothing it acquired should keep shaping the page the crash view renders into. A Command left running would produce Messages that are dropped, and a scroll lock or modal isolation left applied, for example by a Dialog open at the crash, would leave the crash view locked or inert. The release covers:

- Every Command, Subscription, and Managed Resource fiber is interrupted, and every dialog opened through `Dom.showDialog` is released. Their `Effect.acquireRelease` finalizers run with the DOM still on screen.
- The live view is patched away, which releases every Mount through its destroy hook while its element is still in the document.
- Every remaining dialog, `Dom.inertOthers` isolation, and `Dom.lockScroll` lock held through the `Dom` helpers is released, including one taken by a Command that never ran its release.

A finalizer that throws is logged and does not stop the crash view. An error from the first step, the fibers and the dialogs, also reaches `crash.report` and `crash.view` as `maybeReleaseError`. A finalizer that dispatches a Message is dropped, as every dispatch after a crash is. A Command parked on `Render.afterCommit` at the crash is interrupted rather than resumed, so no Command observes the crash view's DOM. Services from `resources` stay built until the runtime is disposed.

## Crash Reporting {#crash-report}

### Reporter Timing

Use `crash.report` to send the failure to Sentry or another reporting service. It receives the same `CrashContext` as `crash.view`.

::Snippet{name="crashReport" label="Crash reporting"}

Foldkit logs the crash at the crash point, releases the application's resources, calls `crash.report` synchronously, and then renders the crash view. It does not await work the reporter starts. If the reporter must flush a buffer or make a request, start that work inside the callback. The Model and Message in the context are the ones captured when the crash happened, before any finalizer ran.

Because the release has already happened, a finalizer that failed during it arrives as `maybeReleaseError`.

### Reporting Failures

If `crash.report` throws, Foldkit logs that error and still renders the crash view.

See the [crash-view example](/example-apps/crash-view) for a working demonstration.
