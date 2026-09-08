# Crash View

## Runtime Failure {#overview}

When an unrecoverable error escapes update, view, or a Command, Foldkit stops the application and renders a crash view. No later Message will run. Recoverable failures should become Messages instead, so update can decide what the person sees next.

The default crash view shows the error message and a reload button. To replace it, pass `crash.view` to `makeApplication`. The function receives a `CrashContext`, followed by `h`. The context has three fields:

- `error` is the error that stopped the application.
- `model` is the Model at the time of the crash.
- `message` is the Message being processed, wrapped in `Option`. It is `None` when the initial render crashes.

::Snippet{name="crashViewCustom" label="Custom crash view example"}

The builder is `HtmlBuilder<never>` because Foldkit can no longer dispatch Messages. Event helpers such as `h.OnClick` therefore fail to compile instead of creating handlers that cannot run.

For an action that does not need Foldkit, set a raw DOM event attribute. For example: `h.Attribute('onclick', 'location.reload()')` reloads the page through the browser.

:::Info{label="Only in crash.view"}
In a normal Foldkit app, always use `OnClick` with Messages, never raw DOM event attributes. `crash.view` is the one exception because the runtime is no longer running.
:::

If the custom crash view throws, Foldkit renders the default crash screen with both errors.

## Crash Reporting {#crash-report}

Use `crash.report` to send the failure to Sentry or another reporting service. It receives the same `CrashContext` as `crash.view`.

::Snippet{name="crashReport" label="Crash reporting example"}

Foldkit calls `crash.report` synchronously and does not await work it starts. If the reporter must flush a buffer or make a request, start that work inside the callback.

Reporting runs before the crash view renders. If `crash.report` throws, Foldkit logs that error and still renders the crash view.

See the [crash-view example](/example-apps/crash-view) for a working demonstration.
