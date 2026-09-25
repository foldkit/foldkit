# DevTools

## Using the Overlay {#overview}

By default, Foldkit DevTools records every Message flowing through your app. Open the overlay to inspect what happened, what changed, and which work the update returned. The overlay renders inside a shadow DOM, so it does not interfere with your styles or layout.

You can see it in action right now. Look for the tab on the bottom right edge of this page.

The panel lists every recorded Message, with the newest at the bottom. Select a row and use the four inspector tabs:

- `Model` shows the full state tree and highlights changed paths.
- `Message` shows the Message payload.
- `Commands` lists the Commands returned by update.
- `Mounts` shows which Mounts started or ended during that render.

The `Live` badge means the host is showing its current Model. The inspector shows the Model at the selected recorded entry. In time-travel mode, selecting a row installs that historical view. It does not pause the live application behind that view. Select `Resume` to patch the latest live view back into the DOM. `Clear` drops the recorded history without restarting the app.

:::Info{label="AI agent integration"}
Foldkit also exposes DevTools to AI agents over the Model Context Protocol. See the [DevTools MCP](/ai/mcp) page for setup.
:::

## Development and Production

DevTools are enabled by default in development. Recording and the MCP bridge live in the core runtime. The browser overlay ships separately in `@foldkit/devtools`. When that package is installed as a development dependency, `@foldkit/vite-plugin` mounts the overlay automatically during development. Production builds omit it without an application-level environment check.

Add a `devTools` object to `makeApplication` only when you need to configure DevTools or allow MCP dispatch. To include the overlay in production, move `@foldkit/devtools` to regular `dependencies` and set `show: 'Always'`. You do not need to import the overlay.

::Snippet{name="devtoolsBasic" label="Configuring DevTools"}

## Configuration

The `devTools` field accepts an object with the following optional properties, or `false` to disable DevTools entirely.

### show

`'Development'` (the default) enables DevTools only in development. `'Always'` enables them in all environments, including production.

### position

Controls where the badge and panel appear on screen. One of `'BottomRight'` (default), `'BottomLeft'`, `'TopRight'`, or `'TopLeft'`.

### mode

`'TimeTravel'` (the default) renders the state at an earlier Message and pauses that historical view. The live Model, history, Commands, Subscriptions, ManagedResources, and live-acquired Mounts continue normally. Their Messages and state changes keep appearing in the panel even though the historical DOM stays in place. Foldkit event handlers and Mounts created by the historical render cannot dispatch, and the overlay blocks pointer interaction. A surviving live Mount observes its `viewStateChanges` Stream and must make its imperative integration read-only while paused so keyboard or programmatic DOM interaction cannot produce Messages. Select `Resume` to patch the latest live view back into the DOM; a replay-created Mount whose element is reused is released before the live action starts.

`'Inspect'` lets you browse recorded states without pausing the app. Use it when visitors can open DevTools in production or staging.

Pass `{ development, production }` to choose a mode for each environment. When `show: 'Always'` keeps DevTools available in production, use `'TimeTravel'` for local debugging and `'Inspect'` in production. Selecting a row will not pause a visitor's app.

::Snippet{name="devtoolsInspect" label="TimeTravel locally, Inspect in production"}

### banner

An optional string displayed as a banner at the top of the panel. Useful for welcoming visitors or leaving a note for your team.

### Message

The application’s `Message` Schema. Required only for AI agent integration: when set and the running app is connected to the [DevTools MCP](/ai/mcp) server, agents can dispatch Messages into the live runtime. The Schema decodes inbound dispatch payloads at the bridge boundary and rejects mismatches with a clean error. Omit this field to disable agent dispatch entirely.

### excludeFromHistory {#exclude-from-history}

A list of Message `_tag` values that DevTools should not record. The Messages still run through update and change the application as usual. They do not appear in the history panel or incur the per-Message diff cost.

Use this option when animation frames, pointer moves, scroll events, or another high-frequency source would flood the history.

You can also stop or resume recording a tag in the overlay’s Settings screen. These choices are saved in this browser and applied before the app starts on reload. Tags listed in `excludeFromHistory` appear as configured by the application and cannot be resumed in the overlay. Changing a recording setting affects future Messages; it does not remove or restore earlier entries. The Submodel filter only changes which recorded rows are displayed.

Excluded Messages continue to update the Live Model. Before the next recorded Message, DevTools saves a checkpoint so replay includes those changes. Each recorded index keeps the Model immediately after its Message, even when later excluded Messages change Live. The history inspector follows the latest recorded state; Resume restores the current Live view.

::Snippet{name="devtoolsExcludeFromHistory" label="Excluding high-frequency Messages from history"}

### maxEntries {#max-entries}

The maximum number of recorded Messages retained before DevTools evicts the oldest entry. The default is `100`, and values are clamped between `20` and `500`.

Smaller values reduce work under high Message rates. Larger values provide more history. Memory use grows with `maxEntries`, Model size, and the number of checkpoints needed after excluded updates.

::Snippet{name="devtoolsMaxEntries" label="Raising the DevTools history cap"}

### keyframeInterval {#keyframe-interval}

The number of recorded Messages between full Model snapshots. The default is `31`, and the minimum is `1`.

To reconstruct an entry, DevTools starts at the nearest earlier snapshot and replays update. A smaller interval stores more snapshots but shortens that replay. Set the interval to `1` when update is expensive and time-travel feels slow. Every entry then has its own snapshot, so no replay is needed.

Exclusions preserve the configured interval. DevTools adds checkpoints after excluded Model changes and replays from the nearest applicable snapshot or checkpoint. Clearing history starts replay from the current Live Model; the init row still shows the original init Model.

::Snippet{name="devtoolsKeyframeInterval" label="Snapshotting every entry for constant-time jumps"}
