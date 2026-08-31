# DevTools

## Using the Overlay {#overview}

By default, Foldkit DevTools records every Message flowing through your app. Open the overlay to inspect what happened, what changed, and which work the update returned. The overlay renders inside a shadow DOM, so it does not interfere with your styles or layout.

You can see it in action right now. Look for the tab on the bottom right edge of this page.

The panel lists every recorded Message, with the newest at the bottom. Select a row and use the four inspector tabs:

- `Model` shows the full state tree and highlights changed paths.
- `Message` shows the Message payload.
- `Commands` lists the Commands returned by update.
- `Mounts` shows which Mounts started or ended during that render.

The `Live` badge tells you whether the inspector shows the latest state or a past entry. In time-travel mode, selecting an earlier row pauses the app at that state. Select `Resume` to return to the latest state. `Clear` drops the recorded history without restarting the app.

:::Info{label="AI agent integration"}
Foldkit also exposes DevTools to AI agents over the Model Context Protocol. See the [DevTools MCP](/ai/mcp) page for setup.
:::

## Settings

The Settings tab includes Highlight re-renders. It draws fading outlines around the boundaries that rendered on the last frame so you can spot over-rendering directly in the page. The toggle is off by default and persists through `KeyValueStore`. See [Re-render Outlines](/devtools/re-render-outlines) for enablement, how to read the overlay, and how it compares to React Scan.

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

`'TimeTravel'` (the default) pauses the app when you select an earlier Message and renders the corresponding state. User interaction is blocked while paused. Subscriptions continue running in the background, and their Messages keep appearing in the panel. Select `Resume` to return to the latest state.

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

When the list contains at least one tag, DevTools stores a full Model snapshot for every recorded entry. That preserves changes made by excluded Messages when you travel to a recorded state. Excluded Messages also update the `Live` Model view, but they do not append a history entry or compute a diff.

::Snippet{name="devtoolsExcludeFromHistory" label="Excluding high-frequency Messages from history"}

### maxEntries {#max-entries}

The maximum number of recorded Messages retained before DevTools evicts the oldest entry. The default is `100`, and values are clamped between `20` and `500`.

Smaller values reduce work under high Message rates. Larger values provide more history. Memory use grows with `maxEntries` and Model size, especially when `excludeFromHistory` makes every recorded entry store a full Model snapshot.

::Snippet{name="devtoolsMaxEntries" label="Raising the DevTools history cap"}

### keyframeInterval {#keyframe-interval}

The number of recorded Messages between full Model snapshots. The default is `31`, and the minimum is `1`.

To reconstruct an entry, DevTools starts at the nearest earlier snapshot and replays update. A smaller interval stores more snapshots but shortens that replay. Set the interval to `1` when update is expensive and time-travel feels slow. Every entry then has its own snapshot, so no replay is needed.

DevTools automatically uses `1` when `excludeFromHistory` is active because excluded Messages are not available for replay.

::Snippet{name="devtoolsKeyframeInterval" label="Snapshotting every entry for constant-time jumps"}
